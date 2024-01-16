

const handleResponse = (req, res, status, message, data) => {
    res.status(status).send({ status, message, data });
}




module.exports = { handleResponse }