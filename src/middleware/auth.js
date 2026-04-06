const userModel = require('../../DB/models/user.model')
const jwt = require('jsonwebtoken');

const userAuth = async (req, res, next) => {
    try {
        const { authrization } = req.headers;
        if (authrization) {
            if (authrization.startsWith(process.env.AUTH_SECRET_KEY)) {
                const userToken = authrization.split(process.env.AUTH_SECRET_KEY)[1]
                const { id } = jwt.verify(userToken, process.env.TOKEN_SECRET_KEY)
                const userFounded = await userModel.findById(id)
                if (userFounded) {
                    if (userFounded.verify) {
                        if (!userFounded.block) {
                            if (userFounded.role == 'User') {
                                req.userData = userFounded
                                next()
                            } else {
                                res.json({ message: 'You do not have access to complete this operation' })
                            }
                        } else {
                            res.json({ message: 'You cannot perform this transaction. This account has been blocked' })
                        }
                    } else {
                        res.json({ message: 'this account is not verify' })
                    }
                } else {
                    res.json({ message: 'this user is not found' })
                }
            } else {
                res.json({ message: 'auth secret key is wrong' })
            }
        } else {
            res.json({ message: 'this user access token is not found' })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const adminAuth = async (req, res, next) => {
    try {
        const { authrization } = req.headers;
        if (authrization) {
            if (authrization.startsWith(process.env.AUTH_SECRET_KEY)) {
                const userToken = authrization.split(process.env.AUTH_SECRET_KEY)[1]
                const { id } = jwt.verify(userToken, process.env.TOKEN_SECRET_KEY)
                const userFounded = await userModel.findById(id)
                if (userFounded) {
                    if (userFounded.verify) {
                        if (!userFounded.block) {
                            if (userFounded.role == 'Admin') {
                                req.userData = userFounded
                                next()
                            } else {
                                res.json({ message: 'You do not have access to complete this operation' })
                            }
                        } else {
                            res.json({ message: 'You cannot perform this transaction. This account has been blocked' })
                        }
                    } else {
                        res.json({ message: 'this account is not verify' })
                    }
                } else {
                    res.json({ message: 'this user is not found' })
                }
            } else {
                res.json({ message: 'auth secret key is wrong' })
            }
        } else {
            res.json({ message: 'this user access token is not found' })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const teacherAuth = async (req, res, next) => {
    try {
        const { authrization } = req.headers;
        if (authrization) {
            if (authrization.startsWith(process.env.AUTH_SECRET_KEY)) {
                const userToken = authrization.split(process.env.AUTH_SECRET_KEY)[1]
                const { id } = jwt.verify(userToken, process.env.TOKEN_SECRET_KEY)
                const userFounded = await userModel.findById(id)
                if (userFounded) {
                    if (userFounded.verify) {
                        if (!userFounded.block) {
                            if (userFounded.role == 'Teacher' && userFounded.disable == false) {
                                req.userData = userFounded
                                next()
                            } else {
                                res.json({ message: 'You do not have access to complete this operation' })
                            }
                        } else {
                            res.json({ message: 'You cannot perform this transaction. This account has been blocked' })
                        }
                    } else {
                        res.json({ message: 'this account is not verify' })
                    }
                } else {
                    res.json({ message: 'this user is not found' })
                }
            } else {
                res.json({ message: 'auth secret key is wrong' })
            }
        } else {
            res.json({ message: 'this user access token is not found' })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const studentAuth = async (req, res, next) => {
    try {
        const { authrization } = req.headers;
        if (authrization) {
            if (authrization.startsWith(process.env.AUTH_SECRET_KEY)) {
                const userToken = authrization.split(process.env.AUTH_SECRET_KEY)[1]
                const { id } = jwt.verify(userToken, process.env.TOKEN_SECRET_KEY)
                const userFounded = await userModel.findById(id)
                if (userFounded) {
                    if (userFounded.verify) {
                        if (!userFounded.block) {
                            if (userFounded.role == 'Student' && userFounded.disable == false) {
                                req.userData = userFounded
                                next()
                            } else {
                                res.json({ message: 'You do not have access to complete this operation' })
                            }
                        } else {
                            res.json({ message: 'You cannot perform this transaction. This account has been blocked' })
                        }
                    } else {
                        res.json({ message: 'this account is not verify' })
                    }
                } else {
                    res.json({ message: 'this user is not found' })
                }
            } else {
                res.json({ message: 'auth secret key is wrong' })
            }
        } else {
            res.json({ message: 'this user access token is not found' })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const schoolAuth = async (req, res, next) => {
    try {
        const { authrization } = req.headers;
        if (authrization) {
            if (authrization.startsWith(process.env.AUTH_SECRET_KEY)) {
                const userToken = authrization.split(process.env.AUTH_SECRET_KEY)[1]
                const { id } = jwt.verify(userToken, process.env.TOKEN_SECRET_KEY)
                const userFounded = await userModel.findById(id)
                if (userFounded) {
                    if (userFounded.verify) {
                        if (!userFounded.block) {
                            if (userFounded.role == 'School' && userFounded.disable == false) {
                                req.userData = userFounded
                                next()
                            } else {
                                res.json({ message: 'You do not have access to complete this operation' })
                            }
                        } else {
                            res.json({ message: 'You cannot perform this transaction. This account has been blocked' })
                        }
                    } else {
                        res.json({ message: 'this account is not verify' })
                    }
                } else {
                    res.json({ message: 'this user is not found' })
                }
            } else {
                res.json({ message: 'auth secret key is wrong' })
            }
        } else {
            res.json({ message: 'this user access token is not found' })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const itAuth = async (req, res, next) => {
    try {
        const { authrization } = req.headers;
        if (authrization) {
            if (authrization.startsWith(process.env.AUTH_SECRET_KEY)) {
                const userToken = authrization.split(process.env.AUTH_SECRET_KEY)[1]
                const { id } = jwt.verify(userToken, process.env.TOKEN_SECRET_KEY)
                const userFounded = await userModel.findById(id)
                if (userFounded) {
                    if (userFounded.verify) {
                        if (!userFounded.block) {
                            if (userFounded.role == 'School' || userFounded.role == 'IT') {
                                if (userFounded.disable == false) {
                                    req.userData = userFounded
                                    next()
                                } else {
                                    res.json({ message: 'You do not have access to complete this operation' })
                                }
                            } else {
                                res.json({ message: 'You do not have access to complete this operation' })
                            }
                        } else {
                            res.json({ message: 'You cannot perform this transaction. This account has been blocked' })
                        }
                    } else {
                        res.json({ message: 'this account is not verify' })
                    }
                } else {
                    res.json({ message: 'this user is not found' })
                }
            } else {
                res.json({ message: 'auth secret key is wrong' })
            }
        } else {
            res.json({ message: 'this user access token is not found' })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const supervisorAuth = async (req, res, next) => {
    try {
        const { authrization } = req.headers;
        if (authrization) {
            if (authrization.startsWith(process.env.AUTH_SECRET_KEY)) {
                const userToken = authrization.split(process.env.AUTH_SECRET_KEY)[1]
                const { id } = jwt.verify(userToken, process.env.TOKEN_SECRET_KEY)
                const userFounded = await userModel.findById(id)
                if (userFounded) {
                    if (userFounded.verify) {
                        if (!userFounded.block) {
                            if (userFounded.role == 'Supervisor' && userFounded.disable == false) {
                                req.userData = userFounded
                                next()
                            } else {
                                res.json({ message: 'You do not have access to complete this operation' })
                            }
                        } else {
                            res.json({ message: 'You cannot perform this transaction. This account has been blocked' })
                        }
                    } else {
                        res.json({ message: 'this account is not verify' })
                    }
                } else {
                    res.json({ message: 'this user is not found' })
                }
            } else {
                res.json({ message: 'auth secret key is wrong' })
            }
        } else {
            res.json({ message: 'this user access token is not found' })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

module.exports = { userAuth, adminAuth, teacherAuth, studentAuth, schoolAuth, itAuth, supervisorAuth }