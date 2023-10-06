
module.exports = (logger) => {

    class PageResult {
        constructor(data, parent) {
            this.data = data;
            this.parent = parent;
        };
        
        subset(data) {
            return new PageResult(data, this);
        };
    };

    class HandlerChain {
        constructor(plugins, index, context, result, url) {
            this.plugins = plugins;
            this.index = index;
            this.context = context;
            this.result = result;
            this.url = url;
        };
        
        async proceed(result, url) {
            const plugin = this.plugins[this.index];
            if(plugin === undefined || plugin === null) {
                return;
            }
            
            const newUrl = url === undefined || url === null ? this.url : url;
            
            const ret = this.result === undefined || this.result === null
                ? new PageResult(result, null) : this.result.subset(result);
            
            const chain = new HandlerChain(this.plugins, this.index+1, this.context, ret, newUrl);

            await plugin(chain);
        };
    
        getContext() {
            return this.context;
        }
        
        lastPageResult() {
            return this.result === undefined || this.result === null
                ? null : this.result.data;
        };
        
        getUrl() {
            return this.url
        };
    };

    class PersistenceContainer {
        constructor(id, database, repository) {
            this.id = id;
            this.database = database;
            this.repository = repository;

            this.durty = [];
        };
        
        getId() {
            return this.id;
        };
    
        async existsPageResult(urls) {
            const repo = this.repository;

            return await this.database(async db => {
                const result = {};
                const data = await repo.findPageResults(db, urls);

                urls.forEach(u => result[u] = false);
				data.forEach(d => result[d.url] = true);

                return result;
            });
        }
        
        async addPageResult(url, data, typeHint) {
            const page_values = [];
            const keys = Object.keys(data);

            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const values = data[key];

                values.forEach(val => page_values.push({
                    data_key : key,
					data_value : val,
					data_type : typeHint[key] !== undefined ? typeHint[key] : "",
                    sort : (i+1)
                }));
            }

            this.durty.push({web_scraping_id : this.getId(),url : url,create_at : new Date(),page_values : page_values});
        };

        async commitResult() {
            const repo = this.repository;

            return await this.database(async db => {
                const result = [];
                for (let i = 0; i < this.durty.length; i++) {
                    const item = this.durty[i];
                    result.push(await repo.createPageResult(db, item));
                }
                return result;
            });
        };
    };

    const pageProcessInvokers = {};
    return {
        register : (name, invoker) => pageProcessInvokers[name] = invoker,
        instanceHandler : (name, configure) => pageProcessInvokers[name] ? (chain) => pageProcessInvokers[name](configure, chain) : () => null,
        instancePersistence : (id, database, repository) => new PersistenceContainer(id, database, repository),
        instanceChain : (plugin, index, context) => new HandlerChain(plugin, index, context, null, null)
    };
};
