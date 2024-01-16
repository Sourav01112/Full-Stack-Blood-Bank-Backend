

const handleResponse = (req, res, status, message, data, success) => {
// console.log("eq, res, status, message, data, succes", req, res, status, message, data, success)

    res.status(status).send({ status, message, data, success });
}




module.exports = { handleResponse }