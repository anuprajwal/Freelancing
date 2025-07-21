const {User, doctorProfile} = require("../../../models")
const sendEmails =  async (req, res) => {
  try {
    const { subject, body, emails } = req.body;

    if (!subject || !body || !emails) {
      return res.status(400).json({ error: 'subject, body, and emails are required' });
    }

    const recipients = await getUsersByFilters(emails);

    if (recipients.length === 0) {
      return res.status(404).json({ error: 'No users found for given filters' });
    }
    const sentEmails = []
    const failedEmails = []
    for (let i of recipients){
      const sendResults = await axios.post('http://localhost:5500/api/send-email', {
      to : i.email,
      subject,
      text: body
    });
    if (sendResults.status !== 200){
      failedEmails.push(i)
    }else{
      sentEmails.push(i)
    }
    }
    res.status(200).json({ message: 'Email status', sentEmails, failedEmails });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send emails' });
  }
};


const getUsersByFilters = async (emails) => {

    const matchedUsers = await User.findAll({
        where: {
          email: {
            [Op.in]: emails
          }
        },
        attributes: ['email', 'username']
      });


    return matchedUsers
};


module.exports = sendEmails