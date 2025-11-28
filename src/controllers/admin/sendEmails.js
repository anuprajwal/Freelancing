const {User, address} = require("../../../models")
const sendEmails =  async (req, res) => {
  try {
    const { subject, body, filters } = req.body;

    if (!subject || !body || !filters) {
      return res.status(400).json({ error: 'subject, body, and filters are required' });
    }

    const recipients = await getUsersByFilters(filters);

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


const getUsersByFilters = async (filters) => {
  let filteredUsers = await User.findMany({where:{
        role:filters.role,
    },
    attributes: ['email', "username"]
  })


  const { role, state = [], district = [] } = filters;

  const { Op } = require('sequelize');
  
  let filteredUsersByLocation = await User.findAll({
    where: {
      role: role
    },
    attributes: ['email', 'username'],
    include: [{
      model: address,
      as: 'address',
      where: {
        [Op.or]: [
          { state: { [Op.in]: state } },
          { district: { [Op.in]: district } }
        ]
      },
      attributes: []
    }]
  });
  

    filteredUsers = [...filteredUsers, ...filteredUsersByLocation]
    return filteredUsers
};

module.exports = sendEmails