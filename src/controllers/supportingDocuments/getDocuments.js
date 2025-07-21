const {documents} = require("../../../models")

const getDocuments = async (req, res)=>{
    const {id} = req.user.payload

    const userDocuments = await documents.findAll({where:{user_id : id}})

    if (!userDocuments){
        return res.status(404).json({error:"couldnot find any document"})
    }

    return res.status(200).json({message:"Succesfully found documents", userDocuments})
}


module.exports = getDocuments