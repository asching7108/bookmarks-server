const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');
const { makeBookmarksArray } = require('./bookmarks.fixtures');

describe.only('Bookmarks Endpoints', function() {
    let db;

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL,
        });
        app.set('db', db);
    })

    before('clean the table', () => db('bookmarks').truncate())

    afterEach('cleanup', () => db('bookmarks').truncate())

    after('disconnect from db', () => db.destroy())

    describe('Unauthorized requests', () => {
        it('responds with 401 Unauthorized for GET /bookmarks', () => {
            return supertest(app)
                .get('/bookmarks')
                .expect(401, { error: 'Unauthorized request' });
        })

        it('responds with 401 Unauthorized for POST /bookmarks', () => {
            return supertest(app)
              .post('/bookmarks')
              .send({ title: 'test-title', url: 'http://some.thing.com', rating: 1 })
              .expect(401, { error: 'Unauthorized request' });
        })

        it('responds with 401 Unauthorized for GET /bookmarks/:id', () => {
            const testId = 2;
            return supertest(app)
                .get(`/bookmarks/${testId}`)
                .expect(401, { error: 'Unauthorized request' });
        })

        it('responds with 401 Unauthorized for DELETE /bookmarks/:id', () => {
            const testId = 2;
            return supertest(app)
                .delete(`/bookmarks/${testId}`)
                .expect(401, { error: 'Unauthorized request' });
            });
    })

    describe('GET /bookmarks', () => {
        context('Given no bookmarks', () => {
            it('responds with 200 and an empty list', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, []);
            })
        })

        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray();
            
            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks);
            })
    
            it('responds with 200 and all of the bookmarks', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, testBookmarks);
            })
        })
    })

    describe('GET /bookmarks/:id', () => {
        context('Given no bookmarks', () => {
            it('responds with 404', () => {
                const testId = 123456;
                return supertest(app)
                    .get(`/bookmarks/${testId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { 
                        error: { message: `Bookmark with id ${testId} not found` }
                    });
            })
        })

        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray();
            
            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks);
            })

            it('responds with 200 and the specified bookmark', () => {
                const testId = 2;
                const expectedBookmark = testBookmarks[testId - 1];
                return supertest(app)
                    .get(`/bookmarks/${testId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, expectedBookmark);
            })
        })
    })

    describe('DELETE /bookmarks/:id', () => {
        context('Given no bookmarks', () => {
            it(`responds with 404 when the bookmark doesn't exist`, () => {
                const testId = 123456;
                return supertest(app)
                    .delete(`/bookmarks/${testId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { 
                        error: { message: `Bookmark with id ${testId} not found` }
                    });
            })
        })

        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray();
            
            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks);
            })

            it('responds with 204 and removes the bookmark from the database', () => {
                const testId = 2;
                const expected = testBookmarks.filter(b => b.id !== testId);
                return supertest(app)
                    .delete(`/bookmarks/${testId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(204)
                    .then(() => {
                        return supertest(app)
                            .get('/bookmarks')
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expected);
                    });
            })
        })
    })
    
    describe('POST /bookmarks', () => {
        it('creates a bookmark, responding with 201 and the new bookmark', () => {
            const newBookmark = {
                title: 'test-title',
                url: 'https://test.com',
                rating: 1,
                description: 'test description'
            };

            return supertest(app)
                .post('/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(newBookmark)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(newBookmark.title);
                    expect(res.body.url).to.eql(newBookmark.url);
                    expect(res.body.description).to.eql(newBookmark.description);
                    expect(res.body.rating).to.eql(newBookmark.rating);
                    expect(res.body).to.have.property('id');
                    expect(res.header.location).to.eql(`/bookmarks/${res.body.id}`);
                })
                .then(res => {
                    return supertest(app)
                        .get(`/bookmarks/${res.body.id}`)
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(res.body);
                });
        })

        const requiredFields = ['title', 'url', 'rating'];

        requiredFields.forEach(field => {
            const newBookmark = {
                title: 'test-title',
                url: 'https://test.com',
                rating: 1
            };

            it(`responds with 400 and an error message when the '${field}' is missing`, () => {
                delete newBookmark[field];
                return supertest(app)
                    .post('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(newBookmark)
                    .expect(400, {
                        error: { message: `${field} is required` }
                })
            })
        })

        it (`responds with 400 and an error message when the 'url' is not valid`, () => {
            const newBookmark = {
                title: 'test-title',
                url: 'not a valid url',
                rating: 1
            };
            return supertest(app)
                .post('/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(newBookmark)
                .expect(400, {
                    error: { message: 'url must be valid' }
                });
        })

        it(`responds with 400 and an error message when the 'rating' is not between 0 and 5`, () => {
            const newBookmark = {
                title: 'test-title',
                url: 'https://test.com',
                rating: 100
            };
            return supertest(app)
                .post('/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(newBookmark)
                .expect(400, {
                    error: { message: 'rating must be a number between 0 and 5' }
                });
        })
    })
})