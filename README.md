The script is used to merge two openmrs databases with the assumption that we have similar concept dictionary and other metadata

**Configurations**

To allow for merging we will need to configure the database connections. Edit the config.json file inside the configs directory with the right database credentials. Below is a sample config file

       {
         "destinationDatabase": {
            "host": "localhost",
            "user": "root",
            "password": "password",
            "database": "openmrs",
            "port": "3306",
            "connectionLimit":100

         },
         "sourceDatabase": {
            "host": "localhost",
            "user": "root",
            "password": "password",
            "database": "source_openmrs",
            "port": "3306",
            "connectionLimit":100
         }
      }

**Running Migrations**

The migrations process should be executed in the following order.

1. Migrate users data

   Obtain all user ids in the source database and put them under the user array in `process-user-migration.ts`

   Run `npm run migrate-users`
   This ensures that patients will be migrated with the users from the source system.

2. Migrate Patients data

   To migrate patients obtain patient ids from the source database and put them in the `patient_ids.csv` csv file in the metadata directory.

   Run `npm run start:create 0...N`

   0 being the index of the starting point and n being the end of the index of patient to migrate.

   During the migration process, the queries will be logged under the `sql.txt` file and the patients who didn't migrate and were rolledback will be logged on the `failed.txt` file
