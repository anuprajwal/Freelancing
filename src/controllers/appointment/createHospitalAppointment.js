const {doctor_profiles} = require('../../../models')


const mapToDoctor = async (req, res)=>{
    const {id} = req.user.payload
    const {lowLoadDoctorIds} = req.sortedDoctors


}