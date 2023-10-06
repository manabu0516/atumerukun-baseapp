

module.exports = async (parameter) => {
    const logger = parameter.logger;

    const repository = require('./repository')(logger);
    const handlerManager = require('./handlerManager')(logger);
    const webApi = require('./webapi')(parameter.installer.web, logger);

    parameter.installer.event("system.initialized", async (name, param) => {
        await parameter.event("handler.load", handlerManager.register);
    });

    const createInvoker = (item) => {
        return async () => {
            parameter.logger.info("start task :" + item.id);

            try {
                const scraping = await parameter.database(async db => {
                    return await repository.getWebscraping(db, item.id);
                });
    
                const handlers = scraping.pageHandlers;
                if(handlers.length === 0) {
                    return;
                }
                const plugins = handlers.map(h => handlerManager.instanceHandler(h.handler_type, h.configure));
                
                const persistence = handlerManager.instancePersistence(item.id, parameter.database, repository);
                const chain = handlerManager.instanceChain(plugins, 0, {
                    persistence : persistence,
                    baseDir : parameter.dir
                }, null);

                await chain.proceed({}, item.target_url);
                await await persistence.commitResult();
            } catch(e) {
                parameter.logger.error("faild task :" + item.id + ',' + (e.stack ? e.stack : e));
            }    
            parameter.logger.info("finish task :" + item.id);
        };
    };

    const createTask = async (item) => {
        const invoker = await createInvoker(item);
        const tname = 'crawler.' + (new Date().getTime()) + '.' + item.name; 
        return {name : tname, invoke : invoker};
    };

    const invokeTask = async(task) => {
        logger.info('start crawler task(direct): ' + task.name);
        await task.invoke();
        logger.info('end crawler task(direct): ' + task.name)
    };

    parameter.installer.task('clawler-task', async (creator) => {
        const entries = await parameter.database(async db => {
            return await repository.allWebscraping(db);
        });

        return entries.filter(item => item.status === 0).map(item => {
            return creator(item.name, item.schedule, createInvoker(item));
        });
    });

    webApi.register(parameter.database, repository, {
        createTask : createTask,
        invokeTask : invokeTask
    });
    
    const result = await parameter.database(async db => {
        await db.run('CREATE TABLE IF NOT EXISTS web_scraping (id integer primary key auto_increment, name varchar(255) unique not null, schedule varchar(255) not null, target_url varchar(255) not null, description text, status integer not null default 0)');
		await db.run('CREATE TABLE IF NOT EXISTS page_handler (id integer primary key auto_increment, web_scraping_id integer not null, name varchar(255) not null, handler_type varchar(255) not null, description text, configure text, sort integer not null)');
		await db.run('CREATE TABLE IF NOT EXISTS page_result (id integer primary key auto_increment, web_scraping_id integer not null, url varchar(255) unique not null, create_at datetime not null)');
		await db.run('CREATE TABLE IF NOT EXISTS page_value (id integer primary key auto_increment, page_result_id integer not null, data_key varchar(255) not null, data_value text, data_type varchar(255) not null, sort integer not null)');
    });

    return {};
};