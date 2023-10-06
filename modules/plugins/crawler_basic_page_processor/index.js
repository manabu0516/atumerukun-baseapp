module.exports = async (parameter) => {

    const appContext = {
        logger      : parameter.logger,
        libraly     : parameter.libraly,
        extention   : {
            url         : require('url'),
            cheerio     : require('cheerio'),
            node_uuid   : require('node-uuid')
        },
        baseDir     : parameter.baseDir
    };

    parameter.installer.event("crawler.handler.load", async (name, register) => {
        register('blog-type-entries', require('./processor/blog-type-entries/index')(appContext));
        register('page-data-resolve', require('./processor/page-data-resolve/index')(appContext));
        register('page-data-persistence', require('./processor/page-data-persistence/index')(appContext));
    });

    parameter.installer.web('resource', "web", {"path": "web"});

    parameter.installer.event("crawler_admin_ui.initialize-form", async (name, register) => {

        register('blog-type-entries',{
            script  : "/crawler_basic_page_processor/web/blog-type-entries/form.js",
            template: "/crawler_basic_page_processor/web/blog-type-entries/form.html"
        });

        register('page-data-resolve', {
            script  : "/crawler_basic_page_processor/web/page-data-resolve/form.js",
            template: "/crawler_basic_page_processor/web/page-data-resolve/form.html"
        });

        register('page-data-persistence', {
            script  : "/crawler_basic_page_processor/web/page-data-persistence/form.js",
            template: "/crawler_basic_page_processor/web/page-data-persistence/form.html"
        });

    });

    return {};
};