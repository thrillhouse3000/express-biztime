const express = require('express');
const router = new express.Router();
const db = require('../db');
const ExpressError = require('../expressError');

router.get('/', async (req, res, next) => {
    try {
        const results = await db.query(`SELECT * FROM invoices`);
        return res.json({invoices: results.rows})
    } catch(err) {
        return next(err)
    }
})

router.get('/:id', async (req, res, next) => {
    try {
        const {id} = req.params;
        const results = await db.query(`SELECT * FROM invoices WHERE id=$1`, [id]);
        const company = await db.query(`SELECT companies.code, companies.name, companies.description FROM companies JOIN invoices on companies.code = invoices.comp_code WHERE id=$1`, [id])
        if(results.rows.length === 0) {
            throw new ExpressError(`Can't find invoice with id of ${id}`, 404)
        }
        const invD = results.rows[0]
        const compD = company.rows[0]
        const invoiceData = {
            id: invD.id,
            comp_code: invD.comp_code,
            amt: invD.amt,
            paid: invD.paid,
            add_date: invD.add_date,
            paid_date: invD.paid_date,
            company: compD
        }
        return res.json({invoice: invoiceData})
    } catch(err) {
        return next(err)
    }
})

router.post('/', async (req, res, next) => {
    try{
        const {comp_code, amt, paid, add_date, paid_date} = req.body;
        const results = await db.query(`INSERT INTO invoices (comp_code, amt, paid, add_date, paid_date) VALUES ($1, $2, $3, $4, $5) RETURNING comp_code, amt, paid, add_date, paid_date`, [comp_code, amt, paid, add_date, paid_date]);
        return res.status(201).json({invoice:results.rows[0]})
    } catch(err) {
        return next(err)
    }
})

router.put('/:id', async(req, res, next) => {
    try {
        const {id} = req.params;
        const {amt} = req.body;
        const results = await db.query(`UPDATE invoices SET amt=$1 WHERE id=$2 RETURNING comp_code, amt, paid, add_date, paid_date`, [amt, id])
        if(results.rows.length === 0) {
            throw new ExpressError(`Can't update invoice with id of ${id}`, 404)
        }
        return res.json({invoice: results.rows[0]})
    } catch(err) {
        return next(err)
    }
})

router.delete('/:id', async(req, res, next) => {
    try {
        const {id} = req.params;
        const results = await db.query(`DELETE FROM invoices WHERE id=$1`, [id])
        return res.send({msg: 'DELETED'})
    } catch(err) {
        return next(err)
    }
})

module.exports = router;
