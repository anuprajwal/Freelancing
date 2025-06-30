// migration file to add a triggers and error manipulations in database

module.exports = {
  up: async (queryInterface, Sequelize) => {
    
    // Trigger for manipulate the staff count of the organisation
    await queryInterface.sequelize.query(`
      CREATE TRIGGER manipulate_staff_count
      AFTER INSERT ON doctor_profiles
      FOR EACH ROW
      BEGIN
        UPDATE organisation_profiles
        SET amount_of_staff = amount_of_staff + 1
        WHERE user_id = NEW.user_id;
      END
    `);

    // Trigger for calculatin the average rating of the doctor
      await queryInterface.sequelize.query(`
        CREATE TRIGGER update_doctor_average_rating
        AFTER INSERT ON review_ratings
        FOR EACH ROW
        BEGIN
          UPDATE doctor_ratings
          SET average_rating = (
            SELECT AVG(rating)
            FROM review_ratings
            WHERE doctor_id = NEW.doctor_id
          )
          WHERE doctor_id = NEW.doctor_id;
        END;
      `);
    // Trigger for calculation of the average rating of a hospital
      await queryInterface.sequelize.query(`
        CREATE TRIGGER update_organisation_average_rating
        AFTER INSERT ON review_ratings
        FOR EACH ROW
        BEGIN
          UPDATE organisation_ratings
          SET organisation_rating = (
            SELECT AVG(doctor_rating), doctor_profiles.organisation_id
            FROM doctor_ratings inner join doctor_profiles on doctor_profiles.id = doctor_ratings.doctor_id
            where doctor_profiles.id = NEW.doctor_id
          )
          WHERE organisation_id = doctor_profiles.organisation_id;
        END;
      `);

    // Trigger for calculating age of the user
    await queryInterface.sequelize.query(`
      CREATE TRIGGER calculate_age_user
      BEFORE INSERT ON general_users
      FOR EACH ROW
      BEGIN
        SET NEW.age = TIMESTAMPDIFF(YEAR, NEW.date_of_birth, CURDATE());
      END;

    `);

    // Trigger for calculating the aage of the doctor
    await queryInterface.sequelize.query(`
      CREATE TRIGGER calculate_age_doctor
      BEFORE INSERT ON doctor_profiles
      FOR EACH ROW
      BEGIN
        SET NEW.age = TIMESTAMPDIFF(YEAR, NEW.date_of_birth, CURDATE());
      END
    `);


    // Trigger for checking and raising error if the organisation_id is null if the hospital_affiliation is null
    await queryInterface.sequelize.query(`
      CREATE TRIGGER check_org_id_null_if_affiliation_null
      BEFORE INSERT ON doctor_profiles
      FOR EACH ROW
      BEGIN
        IF NEW.hospital_affiliation IS NULL AND NEW.organisation_id IS NOT NULL THEN
          SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'organisation_id must be NULL if hospital_affiliation is NULL';
        END IF;
      END;
    `);

    // Trigger for calculating Totaldue and cleared amount of the salary
    await queryInterface.sequelize.query(`
      CREATE TRIGGER update_salary_totals
      BEFORE INSERT ON staff_salaries
      FOR EACH ROW
      BEGIN
        DECLARE total_pending FLOAT DEFAULT 0;
        DECLARE total_completed FLOAT DEFAULT 0;

        -- Sum of pending salaries for this staff
        SELECT IFNULL(SUM(salary_amount), 0)
        INTO total_pending
        FROM staff_salaries
        WHERE staff_id = NEW.staff_id AND salary_status = 'pending';

        -- Sum of completed salaries for this staff
        SELECT IFNULL(SUM(salary_amount), 0)
        INTO total_completed
        FROM staff_salaries
        WHERE staff_id = NEW.staff_id AND salary_status = 'cleared';

        -- Set the current row's fields
        SET NEW.total_due = total_pending;
        SET NEW.cleared_amount = total_completed;
      END;
      `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER update_address_active
      AFTER UPDATE ON addresses
      FOR EACH ROW
      BEGIN
        -- First set all addresses for this user to inactive
        UPDATE addresses 
        SET active = 0
        WHERE user_id = NEW.user_id AND id != NEW.id;
        
        -- Set the newly updated address to active
        UPDATE addresses
        SET active = 1 
        WHERE id = NEW.id;
      END;
    `);

  },

  down: async (queryInterface, Sequelize) => {
    // Drop the various triggers
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS manipulate_staff_count`);
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS update_doctor_average_rating`);
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS update_organisation_average_rating`);
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS calculate_age_user`);
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS calculate_age_doctor`);
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS check_org_id_null_if_affiliation_null`);
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS update_salary_totals`);
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS update_address_active`);
  },
};
