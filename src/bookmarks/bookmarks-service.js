const BookmarksService = {
    getAllBookmarks(knex) {
        return knex
        .select('*')
        .from('bookmarks');
    },

    getById(knex, id) {
        return knex
        .select('*')
        .from('bookmarks')
        .where({ id })
        .first();
    },

    insertBookmark(knex, newData) {
        return knex
            .insert(newData)
            .into('bookmarks')
            .returning('*')
            .then(rows => rows[0])
    },

    deleteById(knex, id) {
        return knex
            .delete()
            .from('bookmarks')
            .where({ id })
    }
};

module.exports = BookmarksService;