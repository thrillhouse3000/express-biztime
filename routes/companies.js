const express = require('express');
const slugify = require('slugify')
const router = new express.Router();
const db = require('../db');
const ExpressError = require('../expressError');

router.get('/', async (req, res, next) => {
    try {
        const results = await db.query(`SELECT code, name FROM companies`);
        return res.json({companies: results.rows})
    } catch(err) {
        return next(err)
    }
})

router.get('/:code', async (req, res, next) => {
    try {
        const {code} = req.params;
        const companyRes = db.query(`SELECT * FROM companies WHERE code=$1`, [code]);
        const invoicesRes = db.query(`SELECT id, amt, paid, add_date, paid_date FROM invoices WHERE comp_code=$1`, [code]);
        const industryRes = db.query(
            `SELECT industry 
            FROM industries AS i 
            JOIN companies_industries AS ci 
            ON i.code = ci.ind_code   
            JOIN companies AS c
            ON ci.comp_code = c.code
            WHERE c.code=$1`, [code]);
        const results = await Promise.allSettled([companyRes, invoicesRes, industryRes])
        if(results[0].value.rowCount === 0) {
            throw new ExpressError(`Can't find company with code of ${code}`, 404)
        }
        const companyData = results[0].value.rows[0]
        const invoicesData = results[1].value.rows
        const invoiceIds = invoicesData.map(inv => inv.id)
        const industryData = results[2].value.rows
        const industries = industryData.map(ind => ind.industry)
        const company = {
            ...companyData,
            invoices: invoiceIds,
            industries: industries
        }
        return res.json({company: company})
    } catch(err) {
        return next(err)
    }
})

router.post('/', async (req, res, next) => {
    try{
        const {name, description} = req.body;
        const code = slugify(name, {lower: true, strict: true})
        const results = await db.query(`INSERT INTO companies (code, name, description) VALUES ($1, $2, $3) RETURNING code, name, description`, [code, name, description]);
        return res.status(201).json({company: results.rows[0]})
    } catch(err) {
        return next(err)
    }
})

router.put('/:code', async(req, res, next) => {
    try {
        const {code} = req.params;
        const {name, description} = req.body;
        const results = await db.query(`UPDATE companies SET name=$1, description=$2 WHERE code=$3 RETURNING code, name, description`, [name, description, code])
        if(results.rows.length === 0) {
            throw new ExpressError(`Can't update company with code of ${code}`, 404)
        }
        return res.json({company: results.rows[0]})
    } catch(err) {
        return next(err)
    }
})

router.delete('/:code', async(req, res, next) => {
    try {
        const {code} = req.params;
        const results = await db.query(`DELETE FROM companies WHERE code=$1`, [code])
        return res.send({status: 'DELETED'})
    } catch(err) {
        return next(err)
    }
})

module.exports = router;