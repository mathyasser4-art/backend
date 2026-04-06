const userModel = require('../../../../DB/models/user.model')
const sendEmail = require('../../../services/sendEmail')
const generateCode = require('../../../services/generateVerificationCode')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
    try {
        const { email, password } = req.body
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth/controller/login.controller.js:8',message:'Login attempt started',data:{email:email,hasPassword:!!password},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'LOGIN'})}).catch(()=>{});
        // #endregion
        const findUser = await userModel.findOne({ $or: [{ 'email': email }, { 'userName': email }] })
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth/controller/login.controller.js:11',message:'User lookup result',data:{userFound:!!findUser,userId:findUser?._id?.toString(),userName:findUser?.userName,role:findUser?.role,isVerified:findUser?.verify},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'LOGIN'})}).catch(()=>{});
        // #endregion
        if (findUser) {
            if (!findUser.verify) {
                findUser.verificationCode = generateCode()
                await findUser.save()
                const emailMessage = `<div style="direction: rtl; padding: 10px 30px;">
                    <p style="font-size: 20px; font-weight: bold; color: #000;">Welcome, ${findUser.fullName}. We are happy that you have registered with us. Your account verification code is</p>
                    <p style="font-size: 40px; font-weight: bold; color: #000;">${findUser.verificationCode}</p>
                    </div>`
                sendEmail(email, emailMessage, 'Account verification', 'Practice Papers')
                res.json({ message: 'this account is not verify check your email to get your code verification', isVerify: false })
            } else {
                const checkPassword = await bcrypt.compare(password, findUser.password)
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth/controller/login.controller.js:23',message:'Password check result',data:{passwordMatch:checkPassword},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'LOGIN'})}).catch(()=>{});
                // #endregion
                if (checkPassword) {
                    const userToken = jwt.sign({ id: findUser._id }, process.env.TOKEN_SECRET_KEY);
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth/controller/login.controller.js:25',message:'Login successful',data:{userId:findUser._id?.toString(),userName:findUser.userName,role:findUser.role,hasToken:!!userToken},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'LOGIN'})}).catch(()=>{});
                    // #endregion
                    res.json({ message: 'success', userToken, userName: findUser.userName, role: findUser.role })
                } else {
                    res.json({ message: 'wrong password' })
                }
            }
        } else {
            res.json({ message: 'this email or username is not registered' })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

module.exports = login