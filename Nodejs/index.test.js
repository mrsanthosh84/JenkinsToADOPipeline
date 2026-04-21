const request = require('supertest');
const { app, server } = require('./index');

afterAll(done => server.close(done));

describe('GET /health', () => {
    it('should return status ok', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('ok');
    });
});
