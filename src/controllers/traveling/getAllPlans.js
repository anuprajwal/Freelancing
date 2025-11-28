const {packages} = require('../../../models')

const getAllPlans = async (req, res)=>{
    const allPlans = await packages.findAll()

    if (!allPlans){
        return res.status(404).json({error:"cant find any packages reggestered in the db"})
    }

    return res.status(200).json({message: 'succesfully fetched all the packaes', allPlans})
}

module.exports = getAllPlans