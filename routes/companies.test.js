process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const db = require('../db');

beforeAll(async () => {
    await db.query(`DROP TABLE IF EXISTS companies_industries`)
    await db.query(`DROP TABLE IF EXISTS invoices`)
    await db.query(`DROP TABLE IF EXISTS companies`)
    await db.query(`DROP TABLE IF EXISTS industries`)
    await db.query(`CREATE TABLE companies (
        code text PRIMARY KEY,
        name text NOT NULL UNIQUE,
        description text
    )`)
    await db.query(`CREATE TABLE invoices (
        id serial PRIMARY KEY,
        comp_code text NOT NULL REFERENCES companies ON DELETE CASCADE,
        amt float NOT NULL,
        paid boolean DEFAULT false NOT NULL,
        add_date date DEFAULT CURRENT_DATE NOT NULL,
        paid_date date,
        CONSTRAINT invoices_amt_check CHECK ((amt > (0)::double precision))
    )`)
    await db.query(`CREATE TABLE industries (
        code text PRIMARY KEY,
        industry text NOT NULL UNIQUE
    )`)
    await db.query(`CREATE TABLE companies_industries (
        id serial PRIMARY KEY,
        comp_code text NOT NULL REFERENCES companies ON DELETE CASCADE,
        ind_code text NOT NULL REFERENCES industries ON DELETE CASCADE
    )`)
})

//create some data before each test
beforeEach(async () => {
    const company = await db.query(`INSERT INTO companies (code, name, description) VALUES ('test', 'TestCom', 'A test company') RETURNING code, name, description`);
    const invoice = await db.query(`INSERT INTO invoices (comp_code, amt) VALUES ('test', 100) RETURNING id, amt, paid, add_date, paid_date`);
    const industry = await db.query(`INSERT INTO industries (code, industry) VALUES ('testing', 'Testing') RETURNING code, industry`)
    const company_industry = await db.query(`INSERT INTO companies_industries (comp_code, ind_code) VALUES ('test', 'testing') RETURNING comp_code, ind_code`)
    testCompany = company.rows[0];
    testInvoice = invoice.rows[0];
    testIndustry = industry.rows[0];
    testCompanyWithInvoices = {
        ...testCompany,
        invoices: [testInvoice.id],
        industries: [testIndustry.industry]
    }
});

//empty the table after each request
afterEach(async () => {
    await db.query(`DELETE FROM companies_industries`)
    await db.query(`DELETE FROM industries`)
    await db.query(`DELETE FROM companies`)
    await db.query(`DELETE FROM invoices`)
});

//close the db connection after tests have run
afterAll(async () => {
    await db.end();
});

describe('GET /companies', () => {
    test("Get list w/ all companies in DB", async () => {
        const res = await request(app).get('/companies')
        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({companies: [{code: testCompany.code, name: testCompany.name}]})
    });
})

describe('GET /companies/:code', () => {
    test("Get a single company by it's code", async () => {
        const res = await request(app).get(`/companies/${testCompany.code}`)
        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({company: testCompanyWithInvoices})
    })
    test("Responds with 404 if company doesnt exist", async () => {
        const res = await request(app).get(`/companies/badCode`)
        expect(res.statusCode).toBe(404)
    })
})

describe('POST /companies', () => {
    test("Create a new company", async () => {
        const res = await request(app).post('/companies').send({name:'TestCom2', description:'Another test company'})
        expect(res.statusCode).toBe(201)
        expect(res.body).toEqual({company: {code: 'testcom2', name:'TestCom2', description:'Another test company'}})
    })
})

describe('PUT /companies/:code', () => {
    test("Update a company by it's code", async () => {
        const res = await request(app).put(`/companies/${testCompany.code}`).send({name: 'testy', description: 'updated'})
        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({company: {code: testCompany.code, name: 'testy', description: 'updated'}})
    })
    test("Responds with 404 if company doesnt exist", async () => {
        const res = await request(app).get(`/companies/badCode`)
        expect(res.statusCode).toBe(404)
    })
})

describe('DELETE /companies/:code', () => {
    test("Delete a company by it's code", async () => {
        const res = await request(app).delete(`/companies/${testCompany.code}`)
        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({status: 'DELETED'})
    })
})