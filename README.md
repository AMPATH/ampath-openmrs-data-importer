Based on the Assumptions on the Tech Specification:
Below are tasks and milestones achieved:

[https://github.com/AMPATH/ampath-openmrs-data-importer/tree/emr-to-emr-skip-mapping](https://github.com/AMPATH/ampath-openmrs-data-importer/tree/emr-to-emr-skip-mapping)

1. **OpenMRS Database Merge Script**
   1. OpenMRS Concepts Mapping to Kenya EMR is done manually
      1. For other countries there is a need to create alternate mapping
   2. Assumption that System A and system B do not have comm Patintets )
      1. If a Person exists in the destination DB, an updated will be done
   3. For Foreign Keys,

**_Package JSON_**

_start:update ⇒ Reviews existing users, updates from the new source_

_start:migrate-users: ⇒ Migrate users table_

**_App Entry Point:_**

_Fetch PatientsIDs , and patients, add on the CSV._

_Loop through the CSV_

`*LoadPatiantData()` → Collect all the attributes columns from the Dataset,\*

_Iterate row per row (1 person)_

`*TransferPatientToAmrs()` → Create a Map used to resolve foreign keys\*

`*savePersonAddress()` → Save the PersonAddress, since we use Users from\*

`*toInsertSQL()` → Iterate through the Object, review columns to be excluded, and generate a SQL Insert Statement.\*

`*save-obs.ts*`
