const express = require('express');
const uuid = require('uuid/v4');
const { isWebUri } = require('valid-url');
const logger = require('../logger');
const { bookmarks } = require('../store');

const bookmarksRouter = express.Router();
const bodyParser = express.json();

bookmarksRouter
	.route('/bookmarks')
	// get the list of all bookmarks
	.get((req, res) => {
		res.json(bookmarks);
	})
	.post(bodyParser, (req, res) => {
		for (const field of ['title', 'url', 'rating']) {
			if (!req.body[field]) {
				logger.error(`${field} is required`);
				return res
					.status(400)
					.send(`${field} is required`);
			}
		}
		const { title, url, rating, desc } = req.body;
		if (!isWebUri(url)) {
			logger.error('url must be valid');
			return res
				.status(400)
				.send('url must be valid');
		}
		if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
				logger.error('rating must be a number between 0 and 5');
				return res
					.status(400)
					.send('rating must be a number between 0 and 5');
		}
		const id = uuid();
		const bookmark = {
			id,
			title,
			url,
			rating,
			desc
		}
		bookmarks.push(bookmark);
		logger.info(`Bookmark with id ${id} created.`);
		res
			.status(201)
			.location(`http://localhost:8000/bookmarks/${id}`)
			.json(bookmark);
	});

bookmarksRouter
	.route('/bookmarks/:id')

	// get the bookmark with the given id
	.get((req, res) => {
		const { id } = req.params;
		const bookmark = bookmarks.find(b => b.id == id);
		if (!bookmark) {
			logger.error(`Bookmark with id ${id} not found.`);
			res
				.status(404)
				.send('Bookmark not found');
		}
		res
			.json(bookmark);
	})

	// delete the bookmark with the given id
	.delete((req, res) => {
		const { id } = req.params;
		const bmIndex = bookmarks.findIndex(b => b.id == id);
		if (bmIndex === -1) {
			logger.error(`Bookmark with id ${id} not found.`);
			res
				.status(404)
				.send('Bookmark not found');
		}
		bookmarks.splice(bmIndex, 1);
		logger.info(`Bookmark with id ${id} deleted.`);
		res
			.status(204)
			.end();
	});

module.exports = bookmarksRouter;