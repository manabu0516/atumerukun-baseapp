
const createSuccessHandler = (req, res) => {	
	return (entries) => {
		res.json({
			status : 200,
			message: "",
			result : entries,
		});
	};
};


module.exports = async (parameter) => {

    const context = {
        forms   : {},
        buttons : {
            pageresult : { navi : [],entry: []}
        }
    };

    parameter.installer.web('resource', "admin", {"path": "admin"});

    parameter.installer.web('get','forminfo', {"callback" : (req, res) => {
        const successHandler = createSuccessHandler(req, res);
        successHandler(context.forms);
	}});
	
	parameter.installer.web('get', 'btninfo/:id', {"callback" : (req, res) => {
		const successHandler = createSuccessHandler(req, res);
		const id = req.params.id;
        successHandler(context.buttons[id]);
    }});

    parameter.installer.event("system.initialized", async (name, param) => {
        await parameter.event("initialize-form", (name, param) => {
            context.forms[name] = param;
        });
    });

    return {};
};