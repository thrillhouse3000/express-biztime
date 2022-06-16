const express = require('express');
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
        const results = await Promise.allSettled([companyRes, invoicesRes])
        if(results[0].value.rowCount === 0) {
            throw new ExpressError(`Can't find company with code of ${code}`, 404)
        }
        const compD = results[0].value.rows[0]
        const invD = results[1].value.rows
        const invIds = invD.map(inv => inv.id)
        const companyData = {
            ...compD,
            invoices: invIds
        }
        return res.json({company: companyData})
    } catch(err) {
        return next(err)
    }
})

router.post('/', async (req, res, next) => {
    try{
        const {code, name, description} = req.body;
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