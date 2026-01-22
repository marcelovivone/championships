"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request = require("supertest");
const setup_1 = require("../../test/setup");
describe('Countries (e2e)', () => {
    let app;
    beforeAll(async () => {
        app = await (0, setup_1.createTestApp)();
    });
    afterAll(async () => {
        await app.close();
    });
    it('/countries (GET) should return an array of countries', () => {
        return request(app.getHttpServer())
            .get('/countries')
            .expect(200)
            .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            if (res.body.length > 0) {
                expect(res.body[0]).toHaveProperty('id');
                expect(res.body[0]).toHaveProperty('name');
            }
        });
    });
});
//# sourceMappingURL=countries.e2e-spec.js.map