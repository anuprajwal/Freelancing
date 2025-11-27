const {User, doctorProfile, appointments} = require("../../../models")


const allAppointments = async (req, res)=>{
    const {org_id} = req.user.payload

    if (!org_id){
        return res.status(404).json({error:"account found, but couldnot find the organisation profile over the account."})
    }

    const allAppointmentsInOrganisation = await doctorProfile.findAll(
      {
        where:{organisation_id:org_id}, 
        include: [
          {
            model: User,
            as: "user",
            include: [
              {
                model: appointments,
                as: "doctorAppointments",
                required: true,
              },
            ],
          },
        ],
      }
    )

    if (allAppointmentsInOrganisation.length === 0){
        return res.status(404).json({error:"can't find any appointments in your organisation"})
    }

    return res.status(200).json({message:"succesfully fetched all the appointments", allAppointmentsInOrganisation})
}

module.exports = allAppointments
