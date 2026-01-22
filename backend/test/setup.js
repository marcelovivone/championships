"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestApp = createTestApp;
const testing_1 = require("@nestjs/testing");
const app_module_1 = require("../src/app.module");
async function createTestApp() {
    const moduleFixture = await testing_1.Test.createTestingModule({
        imports: [app_module_1.AppModule],
    }).compile();
    const app = moduleFixture.createNestApplication();
    await app.init();
    return app;
}
//# sourceMappingURL=setup.js.map