const express = require('express');
const xss = require('xss');
const { isWebUri } = require('valid-url');
const logger = require('../logger');
const { bookmarks } = require('../store');
const BookmarksService = require('./bookmarks-service');

const bookmarksRouter = express.Router();
const bodyParser = express.json();

const serializeBookmark = bookmark => ({
	id: bookmark.id,
	title: xss(bookmark.title),
	url: bookmark.url,
	rating: Number(bookmark.rating),
	description: xss(bookmark.description)
});

bookmarksRouter
	.route('/bookmarks')

	// get the list of all bookmarks
	.get((req, res, next) => {
		BookmarksService.getAllBookmarks(req.app.get('db'))
			.then(bookmarks => {
				res.json(bookmarks.map(serializeBookmark))
			})
			.catch(next);
	})

	// create new bookmark
	.post(bodyParser, (req, res, next) => {
		for (const field of ['title', 'url', 'rating']) {
			if (!req.body[field]) {
				logger.error(`${field} is required`);
				return res.status(400).json({
					error: { message: `${field} is required` }
				});
			}
		}

		const { title, url, rating, description } = req.body;

		if (!isWebUri(url)) {
			logger.error('url must be valid');
			return res.status(400).json({
				error: { message: 'url must be valid' }
			});
		}

		if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
			logger.error('rating must be a number between 0 and 5');
			return res.status(400).json({
				error: { message: 'rating must be a number between 0 and 5' }
			});
		}

		const newBookmark = { title, url, rating, description };

		BookmarksService.insertBookmark(req.app.get('db'), newBookmark)
			.then(bookmark => {
				logger.info(`Bookmark with id ${bookmark.id} created.`);
				res
					.status(201)
					.location(`/bookmarks/${bookmark.id}`)
					.json(serializeBookmark(bookmark));
			})
			.catch(next);
	});

bookmarksRouter
	.route('/bookmarks/:id')
	.all((req, res, next) => {
		const id = req.params.id;
		BookmarksService.getById(req.app.get('db'), id)
			.then(bookmark => {
				if (!bookmark) {
					logger.error(`Bookmark with id ${id} not found.`);
					return res.status(404).json({
						error: { message: `Bookmark with id ${id} not found` }
					});
				}
			res.bookmark = bookmark;
			next();
		})
		.catch(next);
	})

	// get the bookmark with the given id
	.get((req, res, next) => {
		res.json(serializeBookmark(res.bookmark));
	})

	// delete the bookmark with the given id
	.delete((req, res, next) => {
		const { id } = req.params;
		
		BookmarksService.deleteById(req.app.get('db'), id)
			.then(() => {
				logger.info(`Bookmark with id ${id} deleted.`);
				res
					.status(204).end();
			})
			.catch(next);
	});

module.exports = bookmarksRouter;