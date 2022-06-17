const express = require('express');
const router = new express.Router();
const db = require('../db');
const ExpressError = require('../expressError');

router.get('/', async (req, res, next) => {
    try {
        const results = await db.query(
            `SELECT code, industry, array_agg(comp_code) AS comp_codes
            FROM industries AS i
            LEFT JOIN companies_industries AS ci
            ON i.code = ci.ind_code
            GROUP BY code`)
        return res.json({industries: results.rows})
    } catch(err) {
        return next(err)
    }
})

router.post('/', async (req, res, next) => {
    try{
        const {code, industry} = req.body
        const results = await db.query(`INSERT INTO industries (code, industry) VALUES ($1, $2) RETURNING code, industry`, [code, industry])
        return res.status(201).json({industry: results.rows[0]})
    } catch(err) {
        return next(err)
    }
})

router.post('/companies/:comp_code', async (req, res, next) => {
    try {
        const {comp_code} = req.params
        const {ind_code} = req.body
        const results = await db.query(`INSERT INTO companies_industries (comp_code, ind_code) VALUES ($1, $2) RETURNING id, comp_code, ind_code`, [comp_code, ind_code])
        return res.status(201).json({company_industry: results.rows[0]})
    } catch(err) {
        return next(err)
    }
})

module.exports = router;