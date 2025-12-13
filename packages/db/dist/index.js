"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
let prismaGlobal;
exports.prisma = (() => {
    if (!prismaGlobal) {
        prismaGlobal = new client_1.PrismaClient();
    }
    return prismaGlobal;
})();
exports.default = exports.prisma;
