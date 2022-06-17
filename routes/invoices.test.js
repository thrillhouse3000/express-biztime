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
})

//create some data before each test
beforeEach(async () => {
    const company = await db.query(`INSERT INTO companies (code, name, description) VALUES ('test', 'TestCom', 'A test company') RETURNING code, name, description`);
    const invoice = await db.query(`INSERT INTO invoices (comp_code, amt, paid, add_date, paid_date) VALUES ('test', 100, false, '2022-06-15T06:00:00.000Z', null) RETURNING id, comp_code, amt, paid, add_date, paid_date`);
    testCompany = company.rows[0];
    testInvoice = invoice.rows[0];
    testInvoice.add_date = "2022-06-15T06:00:00.000Z"
    testInvoiceWithCompany = {
        id: testInvoice.id,
        amt: testInvoice.amt,
        paid: testInvoice.paid,
        add_date: testInvoice.add_date,
        paid_date: testInvoice.paid_date,
        company: testCompany
    };
});

//empty the table after each request
afterEach(async () => {
    await db.query(`DELETE FROM companies`)
    await db.query(`DELETE FROM invoices`)
});

//close the db connection after tests have run
afterAll(async () => {
    await db.end();
});

describe('GET /invoices', () => {
    test("Get list w/ all invoices in DB", async () => {
        const res = await request(app).get('/invoices')
        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({invoices: [{id: testInvoice.id, comp_code: testInvoice.comp_code}]})
    });
})

describe('GET /invoices/:id', () => {
    test("Get a single invoice by it's id", async () => {
        const res = await request(app).get(`/invoices/${testInvoice.id}`)
        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({invoice: testInvoiceWithCompany})
    })
    test("Responds with 404 if invoice doesnt exist", async () => {
        const res = await request(app).get('/invoices/5000')
        expect(res.statusCode).toBe(404)
    })
})

describe('POST /invoices', () => {
    test("Create a new invoice", async () => {
        const res = await request(app).post('/invoices').send({comp_code: testCompany.code, amt: 222})
        expect(res.statusCode).toBe(201)
        expect(res.body).toEqual({invoice: 
            {
                id: expect.any(Number),
                comp_code: 'test',
                amt: 222,
                paid: false,
                add_date: expect.any(String),
                paid_date: null
            }
        })
    })
})

describe('PUT /invoices/:id', () => {
    test("Pay off an invoice by it's id", async () => {
        const res = await request(app).put(`/invoices/${testInvoice.id}`).send({amt: 333, paid: true})
        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({invoice:
            {
                id: expect.any(Number),
                comp_code: 'test',
                amt: 333,
                paid: true,
                add_date: expect.any(String),
                paid_date: expect.any(String)
            }
        })
    })
    test("Unpay an invoice by it's id", async () => {
        const res = await request(app).put(`/invoices/${testInvoice.id}`).send({amt: 333, paid: false})
        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({invoice:
            {
                id: expect.any(Number),
                comp_code: 'test',
                amt: 333,
                paid: false,
                add_date: expect.any(String),
                paid_date: null
            }
        })
    })
    test("Pay an invoice amount by it's id", async () => {
        const res = await request(app).put(`/invoices/${testInvoice.id}`).send({amt: 444, paid: false})
        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({invoice:
            {
                id: expect.any(Number),
                comp_code: 'test',
                amt: 444,
                paid: false,
                add_date: expect.any(String),
                paid_date: null
            }
        })
    })
    test("Responds with 404 if company doesnt exist", async () => {
        const res = await request(app).get(`/companies/badCode`)
        expect(res.statusCode).toBe(404)
    })
})

describe('DELETE /invoices/:id', () => {
    test("Delete an invoice by it's id", async () => {
        const res = await request(app).delete(`/invoices/${testInvoice.id}`)
        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({status: 'DELETED'})
    })
})