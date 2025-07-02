const appointments = require("../../models/appointments")
const doctorProfile = require("../../models/doctorProfile")
const { Op, fn, col, literal } = require('sequelize');

// the api file which returns the sorted doctors based on their availability
// doctors are sorted less appointment doctors first

const getSortedDoctors = async (req, res, next)=>{
    const {id} = req.user.payload
    const {hospital_id, specialization} = req.body
    
    const doctorsInHospitals = await doctorProfile.findAll({where:{organisation_id : hospital_id, specialization : specialization}})

    const today = new Date();
    today.setHours(0, 0, 0, 0);


    const endDate = new Date();
    endDate.setDate(today.getDate() + 7);

    const appointmentsCount = await appointments.findAll({
      attributes: [
        'doctor_id',
        [fn('COUNT', col('id')), 'appointment_count']
      ],
      where: {
        appointment_status: {
          [Op.in]: ['confirmed', 'pending']
        },
        appointment_date: {
          [Op.gte]: today,
          [Op.lt]: endDate
        }
      },
      group: ['doctor_id'],
      order: [[literal('appointment_count'), 'ASC']] // doctors with least appointments first
    });

    let doctors = doctorsInHospitals.map(async doctor => {
        return  {
            doctor_id : doctor.id,
            appointments : await appointments.findAll({where:{doctor_id : doctor.id, appointment_status: "confirmed" || "pending"}})
        }
    })

    let sortedDoctors = doctors.sort((a, b) => {
        return a.appointments.length - b.appointments.length
    })

    console.log(sortedDoctors)

    req.sortedDoctors = {
        sortedDoctors,
        doctors
    }
    next()
}

module.exports = {getSortedDoctors}