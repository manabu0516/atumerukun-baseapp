class Repository {
	
	createWebscraping(db, json) {
		const parameter1 = [json.name, json.schedule, json.target_url, json.description, json.status];
		
		return db.insertQuery("insert into web_scraping (name, schedule, target_url, description, status) values (?, ?, ?, ?, ?)", parameter1)
			.then(id => {
				var sortNo = 0;
				const promisses = json.pageHandlers.map(h => {
					const sort = ++sortNo;
					const parameter2 = [id, h.handler_type, h.name, h.description, JSON.stringify(h.configure), sort];				
					return db.insertQuery("insert into page_handler (web_scraping_id, handler_type, name, description, configure, sort) values (?,?,?,?,?,?)", parameter2);
				})
				return Promise.all(promisses).then(values => id);
			});
	};
	
	removeWebscraping(db, id) {
		const p1 =db.deleteQuery("DELETE FROM web_scraping WHERE id = ?", [id]);
		const p2 = db.deleteQuery( "DELETE  FROM page_handler WHERE web_scraping_id = ?", [id]);
		return Promise.all([p1, p2]).then(values => {
			return true;
		});
	};
	
	updateWebscraping(db, id, json) {
		const parameter1 = [json.name, json.schedule, json.target_url, json.description, json.status, id];
		
		return db.updateQuery("update web_scraping SET name=?, schedule=?, target_url=?, description=?, status=? WHERE id = ?", parameter1)
			.then(() => id)
			.then(id => {
				return db.deleteQuery( "DELETE  FROM page_handler WHERE web_scraping_id = ?", [id])
					.then(() => id);
			}).then(id => {
				var sortNo = 0;
				const promisses = json.pageHandlers.map(h => {
					const sort = ++sortNo;
					const parameter2 = [id, h.handler_type, h.name, h.description, JSON.stringify(h.configure), sort];
					return db.insertQuery("insert into page_handler (web_scraping_id, handler_type, name, description, configure, sort) values (?,?,?,?,?,?)", parameter2);
				});
				return Promise.all(promisses).then(values => id);
			});
	};
	
	getWebscraping(db, id) {
		const p1 = db.selectQuery( "SELECT id, name, schedule, target_url, description, status FROM web_scraping WHERE id = ?", [id]);
		const p2 = db.selectQuery( "SELECT id, web_scraping_id, handler_type, name, description, configure, sort FROM page_handler WHERE web_scraping_id = ? ORDER BY sort ASC", [id]);
		
		return Promise.all([p1, p2]).then(values => {
			const webScraping = values[0];
			const pageHandlers = values[1];
			
			pageHandlers.forEach(h => {
				h.configure = JSON.parse(h.configure);
			});
			
			if(webScraping.length !== 1) {
				return null;
			}
			
			const result = webScraping[0];
			result.pageHandlers = pageHandlers;
			
			return result;
		});
	};
	
	allWebscraping(db, offset, limit) {
		const baseSql = "SELECT id, name, schedule, target_url, description, status FROM web_scraping";
		const limitSql = limit !== undefined ? " LIMIT " + limit : "";
		const offsetSql = offset !== undefined ? " OFFSET " + offset : "";
		const sql = baseSql + limitSql + offsetSql;
		return db.selectQuery(sql, []);
	};
	
	findPageResults(db, urls) {
		const inquery = "(" + urls.map(u => "'" + u + "'").join(",") + ")";
		return db.selectQuery( "SELECT id, web_scraping_id, url, create_at FROM page_result WHERE url IN " + inquery, []);
	};

	getPageResult(db, id) {
		const p1 = db.selectQuery( "SELECT id, web_scraping_id, url, create_at FROM page_result WHERE id = ?", [id]);
		const p2 = db.selectQuery( "SELECT id, page_result_id, data_key, data_value, data_type, sort FROM page_value WHERE page_result_id = ? ORDER BY sort ASC", [id]);
		
		return Promise.all([p1, p2]).then(values => {
			const pageResults = values[0];
			const pageValues = values[1];
			
			if(pageResults.length !== 1) {
				return null;
			}
			
			const result = JSON.parse(JSON.stringify(pageResults[0]));
			const map = {};
			
			pageValues.forEach(v => {
				if(map[v.data_key] === undefined) {
					map[v.data_key] = [];
				}
				
				map[v.data_key].push({
					pid : id,
					id : v.id,
					data_key : v.data_key,
					data_value : v.data_value,
					data_type : v.data_type,
					sort : v.sort
				});
			});
			
			result.page_values = map
			return result;
		});
	};
	
	createPageResult(db, json) {
		const parameter1 = [json.web_scraping_id, json.url, json.create_at];
		const page_values = json.page_values;
		
		return db.insertQuery("insert into page_result (web_scraping_id, url, create_at) values (?, ?, ?)", parameter1)
				.then(id => {
					const promisses = page_values.map(h => {
						const parameter2 = [id, h.data_key, h.data_value, h.data_type, h.sort];
						return db.insertQuery("insert into page_value (page_result_id, data_key, data_value, data_type, sort) values (?,?,?,?,?)", parameter2);
					});
					
					return Promise.all(promisses).then(values => id);
				});
	};

	allPageResult(db, web_scraping_id, offset, limit) {
		const baseSql = "SELECT web_scraping.id as web_scraping_id, name, page_result.id as id , web_scraping_id, url, create_at FROM page_result INNER JOIN web_scraping ON page_result.web_scraping_id = web_scraping.id";
		
		const where = web_scraping_id !== undefined ? " WHERE web_scraping_id = ? " : "";
		const parameter = web_scraping_id !== undefined ? [web_scraping_id] : [];
		
		const limitSql = limit !== undefined ? " LIMIT " + limit : "";
		const offsetSql = offset !== undefined ? " OFFSET " + offset : "";
		const sql = baseSql + where + " ORDER BY create_at DESC " + limitSql + offsetSql;
		return db.selectQuery(sql, parameter);
	};
	
	removePageResult(db, id) {
		const p1 = db.deleteQuery( "DELETE FROM page_result WHERE id = ?", [id]);
		const p2 = db.deleteQuery( "DELETE  FROM page_value WHERE page_result_id = ?", [id]);
		
		return Promise.all([p1, p2]).then(values => {
			return true;
		});
	};

	createPageValue(db, page_result_id, json) {
		const parameter = [page_result_id, json.data_key, json.data_value, json.data_type, json.sort];
		return db.insertQuery("insert into page_value (page_result_id, data_key, data_value, data_type, sort) values (?,?,?,?,?)", parameter);
	};

	updatePageValue(db, page_result_id, page_value_id, json) {
		const parameter = [json.data_key, json.data_value, json.data_type, json.sort, page_result_id, page_value_id];
		return b.updateQuery("update page_value SET data_key=?, data_value=?, data_type=?, sort=? WHERE page_result_id = ? AND id = ?", parameter)
	};
	
	removePageValue(db, id) {
		return db.deleteQuery( "DELETE  FROM page_value WHERE id = ?", [id]).then(values => {
			return true;
		});
	};
};

module.exports = (logger) => {
    return new Repository();
};