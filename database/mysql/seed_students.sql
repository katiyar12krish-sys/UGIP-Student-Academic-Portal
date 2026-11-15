-- Run first: SET @aes_key := 'your-secret-key';  (Aadhaar encrypted with AES)
USE gpt_portal;
SET @fac := 0;
-- Diya Adhikari
INSERT INTO users (role_id,full_name,email,phone,password_hash) VALUES (3,'Diya Adhikari','diya011@student.gpt-tanakpur.gov.in','6395564408','CHANGE_ME_HASH');
SET @u := LAST_INSERT_ID();
INSERT INTO students (user_id,ubter_roll_no,aadhar_name,aadhar_enc,branch_code,entry_type,batch,current_year,current_semester,category,gender,tenth_percentage,twelfth_percentage,full_address,mother_name,father_name) VALUES (@u,'24090050011','Diya Adhikari',AES_ENCRYPT('5347 8526 5552',@aes_key),'CSE','Regular','2024-2027',3,5,'General','Female','78.2','60','Nakot, Lohaghat, Champawat, Uttarakhand (Post Office: Malla Khatera)','Renu Devi','Deepak Singh Adhikari');
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,1,'65.80','7.12');
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,2,'66.60','7.44');
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,3,'84.80','8.48');
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,4,'83.80','8.38');
INSERT INTO student_status_history (student_id,status,remarks) VALUES (@u,'Active / Enrolled','Initial record');
-- Varsha Rana
INSERT INTO users (role_id,full_name,email,phone,password_hash) VALUES (3,'Varsha Rana','varsha029@student.gpt-tanakpur.gov.in','7618486041','CHANGE_ME_HASH');
SET @u := LAST_INSERT_ID();
INSERT INTO students (user_id,ubter_roll_no,aadhar_name,aadhar_enc,branch_code,entry_type,batch,current_year,current_semester,category,gender,tenth_percentage,twelfth_percentage,full_address,mother_name,father_name) VALUES (@u,'24090050029','Varsha Rana',NULL,'CSE','Regular','2024-2027',3,5,NULL,NULL,'64.6','57.6','Tedaghat, Bari Anjaniya, Khatima, Udham Singh Nagar','Shashi Devi','Jai Pal Singh');
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,1,'65.0',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,2,'67.1',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,3,'80.9',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,4,'84.7',NULL);
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,1,NULL,'7.04');
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,2,NULL,'8.83');
INSERT INTO student_status_history (student_id,status,remarks) VALUES (@u,'Active / Enrolled','Initial record');
-- Raju Garkoti
INSERT INTO users (role_id,full_name,email,phone,password_hash) VALUES (3,'Raju Garkoti','raju013@student.gpt-tanakpur.gov.in','6398202887','CHANGE_ME_HASH');
SET @u := LAST_INSERT_ID();
INSERT INTO students (user_id,ubter_roll_no,aadhar_name,aadhar_enc,branch_code,entry_type,batch,current_year,current_semester,category,gender,tenth_percentage,twelfth_percentage,full_address,mother_name,father_name) VALUES (@u,'24090020013','Raju Garkoti',NULL,'CIVIL','Regular','2024-2027',3,5,NULL,NULL,'60.6','75','Village Tand Malla, Post Office Machiyar, Champawat, Uttarakhand','Deepa Devi','Dungar Dev');
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,1,'65.8',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,2,'69.7',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,3,'74.6',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,4,'71.7',NULL);
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,1,NULL,'7.32');
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,2,NULL,'7.83');
INSERT INTO student_status_history (student_id,status,remarks) VALUES (@u,'Active / Enrolled','Initial record');
-- Jayant Balmiki
INSERT INTO users (role_id,full_name,email,phone,password_hash) VALUES (3,'Jayant Balmiki','jayant001@student.gpt-tanakpur.gov.in','7505677649','CHANGE_ME_HASH');
SET @u := LAST_INSERT_ID();
INSERT INTO students (user_id,ubter_roll_no,aadhar_name,aadhar_enc,branch_code,entry_type,batch,current_year,current_semester,category,gender,tenth_percentage,twelfth_percentage,full_address,mother_name,father_name) VALUES (@u,'25090052001','Jayant Balmiki',NULL,'CSE','Lateral','2025-2027',3,5,NULL,NULL,'60.8','43.6','Ghasiyara Mandi, Ward No. 9, Tanakpur','Rekha Balmiki','Shyam Balmiki');
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,3,'71',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,4,'70.6',NULL);
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,2,NULL,'7.54');
INSERT INTO student_status_history (student_id,status,remarks) VALUES (@u,'Active / Enrolled','Initial record');
-- Sumit Joshi
INSERT INTO users (role_id,full_name,email,phone,password_hash) VALUES (3,'Sumit Joshi','sumit005@student.gpt-tanakpur.gov.in','6399854521','CHANGE_ME_HASH');
SET @u := LAST_INSERT_ID();
INSERT INTO students (user_id,ubter_roll_no,aadhar_name,aadhar_enc,branch_code,entry_type,batch,current_year,current_semester,category,gender,tenth_percentage,twelfth_percentage,full_address,mother_name,father_name) VALUES (@u,'25090052005','Sumit Joshi',NULL,'CSE','Lateral','2025-2027',3,5,NULL,NULL,'68','63.2','Near Mandi Samiti, Khatima','Mamta Joshi','Mohan Joshi');
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,3,NULL,'6.50');
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,4,NULL,'6.13');
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,2,NULL,'6.32');
INSERT INTO student_status_history (student_id,status,remarks) VALUES (@u,'Active / Enrolled','Initial record');
-- Aaditya Singh Kunwar
INSERT INTO users (role_id,full_name,email,phone,password_hash) VALUES (3,'Aaditya Singh Kunwar','aaditya001@student.gpt-tanakpur.gov.in','8979374569','CHANGE_ME_HASH');
SET @u := LAST_INSERT_ID();
INSERT INTO students (user_id,ubter_roll_no,aadhar_name,aadhar_enc,branch_code,entry_type,batch,current_year,current_semester,category,gender,tenth_percentage,twelfth_percentage,full_address,mother_name,father_name) VALUES (@u,'24090050001','Aaditya Singh Kunwar',NULL,'CSE','Regular','2024-2027',3,5,NULL,NULL,'74',NULL,'Reikot Kunwar, Lohaghat','Seema Kunwar','Manoj Singh Kunwar');
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,1,NULL,'6.69');
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,2,NULL,'6.60');
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,3,NULL,'8.47');
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,4,NULL,'8.23');
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,1,NULL,'6.96');
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,2,NULL,'8.47');
INSERT INTO student_status_history (student_id,status,remarks) VALUES (@u,'Active / Enrolled','Initial record');
-- Neha Samant
INSERT INTO users (role_id,full_name,email,phone,password_hash) VALUES (3,'Neha Samant','neha002@student.gpt-tanakpur.gov.in','7505911744','CHANGE_ME_HASH');
SET @u := LAST_INSERT_ID();
INSERT INTO students (user_id,ubter_roll_no,aadhar_name,aadhar_enc,branch_code,entry_type,batch,current_year,current_semester,category,gender,tenth_percentage,twelfth_percentage,full_address,mother_name,father_name) VALUES (@u,'25090052002','Neha Samant',NULL,'CSE','Lateral','2025-2027',3,5,NULL,NULL,'75.9','66.2','Bastiya, Tanakpur','Lalita Devi','Kheem Singh Samant');
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,3,'79.3',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,4,'80.2',NULL);
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,2,NULL,'8.40');
INSERT INTO student_status_history (student_id,status,remarks) VALUES (@u,'Active / Enrolled','Initial record');
-- Abdul Ahad
INSERT INTO users (role_id,full_name,email,phone,password_hash) VALUES (3,'Abdul Ahad','abdul001@student.gpt-tanakpur.gov.in','9897983201','CHANGE_ME_HASH');
SET @u := LAST_INSERT_ID();
INSERT INTO students (user_id,ubter_roll_no,aadhar_name,aadhar_enc,branch_code,entry_type,batch,current_year,current_semester,category,gender,tenth_percentage,twelfth_percentage,full_address,mother_name,father_name) VALUES (@u,'24090020001','Abdul Ahad',NULL,'CIVIL','Regular','2024-2027',3,5,NULL,NULL,'66.2','54','Opposite Hotel Parwat, Railway Station Road, Tanakpur','Nahid','Nazrul Samad');
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,1,'67.6',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,2,'70.4',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,3,'74',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,4,'78',NULL);
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,1,NULL,'6.90');
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,2,NULL,'7.60');
INSERT INTO student_status_history (student_id,status,remarks) VALUES (@u,'Active / Enrolled','Initial record');
-- Muskan Singh
INSERT INTO users (role_id,full_name,email,phone,password_hash) VALUES (3,'Muskan Singh','muskan019@student.gpt-tanakpur.gov.in','9760662775','CHANGE_ME_HASH');
SET @u := LAST_INSERT_ID();
INSERT INTO students (user_id,ubter_roll_no,aadhar_name,aadhar_enc,branch_code,entry_type,batch,current_year,current_semester,category,gender,tenth_percentage,twelfth_percentage,full_address,mother_name,father_name) VALUES (@u,'24090050019','Muskan Singh',NULL,'CSE','Regular','2024-2027',3,5,NULL,NULL,'69.4','60.4','Sharda Ghat, Ward No. 01, Tanakpur, Champawat, Uttarakhand','Meena','Rakesh Singh');
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,1,'77.3',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,2,'85',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,3,'89.3',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,4,'83.9',NULL);
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,1,'82.08','8.64');
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,2,'85.69','9.02');
INSERT INTO student_status_history (student_id,status,remarks) VALUES (@u,'Active / Enrolled','Initial record');
-- Sameer Kumar
INSERT INTO users (role_id,full_name,email,phone,password_hash) VALUES (3,'Sameer Kumar','sameer004@student.gpt-tanakpur.gov.in','7817835587','CHANGE_ME_HASH');
SET @u := LAST_INSERT_ID();
INSERT INTO students (user_id,ubter_roll_no,aadhar_name,aadhar_enc,branch_code,entry_type,batch,current_year,current_semester,category,gender,tenth_percentage,twelfth_percentage,full_address,mother_name,father_name) VALUES (@u,'25090052004','Sameer Kumar',NULL,'CSE','Lateral','2025-2027',3,5,NULL,NULL,'87.2','77.6','Vill. Bamanpuri, Banbasa, P.O. Chandani, Dist. Champawat, Uttarakhand','Durga Devi','Kamlesh Kumar');
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,3,'80.7',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,4,'84.7',NULL);
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,2,'83.32','8.77');
INSERT INTO student_status_history (student_id,status,remarks) VALUES (@u,'Active / Enrolled','Initial record');
-- Uday Kumar
INSERT INTO users (role_id,full_name,email,phone,password_hash) VALUES (3,'Uday Kumar','uday028@student.gpt-tanakpur.gov.in','8057447759','CHANGE_ME_HASH');
SET @u := LAST_INSERT_ID();
INSERT INTO students (user_id,ubter_roll_no,aadhar_name,aadhar_enc,branch_code,entry_type,batch,current_year,current_semester,category,gender,tenth_percentage,twelfth_percentage,full_address,mother_name,father_name) VALUES (@u,'24090050028','Uday Kumar',NULL,'CSE','Regular','2024-2027',3,5,NULL,NULL,'71',NULL,'Bari Anjana, Post Jamour, Khatima, Udham Singh Nagar','Vandana Devi','Rajkumar');
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,1,'70.7',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,2,'75',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,3,'85.8',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,4,'80.7',NULL);
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,1,NULL,'7.70');
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,2,NULL,'8.72');
INSERT INTO student_status_history (student_id,status,remarks) VALUES (@u,'Active / Enrolled','Initial record');
-- Krishna Katiyar
INSERT INTO users (role_id,full_name,email,phone,password_hash) VALUES (3,'Krishna Katiyar','krishna016@student.gpt-tanakpur.gov.in','8449495147','CHANGE_ME_HASH');
SET @u := LAST_INSERT_ID();
INSERT INTO students (user_id,ubter_roll_no,aadhar_name,aadhar_enc,branch_code,entry_type,batch,current_year,current_semester,category,gender,tenth_percentage,twelfth_percentage,full_address,mother_name,father_name) VALUES (@u,'24090050016','Krishna Katiyar',NULL,'CSE','Regular','2024-2027',3,5,NULL,NULL,'82.6','81.8','Ward No. 14, Near Best View Hotel, Khatima, Udham Singh Nagar, Uttarakhand','Anarkali Katiyar','Ram Sevak Katiyar');
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,1,'83.56',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,2,'86',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,3,'87.6',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,4,'85.1',NULL);
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,1,'77.52','8.16');
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,2,'87.30','9.19');
INSERT INTO student_status_history (student_id,status,remarks) VALUES (@u,'Active / Enrolled','Initial record');
-- Anurag Mourya
INSERT INTO users (role_id,full_name,email,phone,password_hash) VALUES (3,'Anurag Mourya','anurag007@student.gpt-tanakpur.gov.in','9068768351','CHANGE_ME_HASH');
SET @u := LAST_INSERT_ID();
INSERT INTO students (user_id,ubter_roll_no,aadhar_name,aadhar_enc,branch_code,entry_type,batch,current_year,current_semester,category,gender,tenth_percentage,twelfth_percentage,full_address,mother_name,father_name) VALUES (@u,'24090050007','Anurag Mourya',NULL,'CSE','Regular','2024-2027',3,5,NULL,NULL,'64.4','68.4','Bhindara, Majhola, Pilibhit, Uttar Pradesh','Sushila Devi','Om Prakash');
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,1,'74.3',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,2,'78.9',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,3,'90.9',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,4,'84.1',NULL);
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,1,NULL,'8.12');
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,2,NULL,'9.22');
INSERT INTO student_status_history (student_id,status,remarks) VALUES (@u,'Active / Enrolled','Initial record');
-- Tarun Giri (Civil; 12th % and gender not given yet -> NULL, fill in from the portal)
INSERT INTO users (role_id,full_name,email,phone,password_hash) VALUES (3,'Tarun Giri','tarun019@student.gpt-tanakpur.gov.in','9528542278','CHANGE_ME_HASH');
SET @u := LAST_INSERT_ID();
INSERT INTO students (user_id,ubter_roll_no,aadhar_name,aadhar_enc,aadhar_hash,branch_code,entry_type,batch,current_year,current_semester,category,gender,tenth_percentage,twelfth_percentage,full_address,mother_name,father_name) VALUES (@u,'24090020019','Tarun Giri',AES_ENCRYPT('9846 5240 0133',@aes_key),SHA2('984652400133',256),'CIVIL','Regular','2024-2027',3,5,'General',NULL,'50',NULL,'Manhiargot, Khatima Road, Tanakpur, Champawat','Sarita Giri','Rambir Giri');
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,1,'62.3',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,2,'64.2',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,3,'63.1',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,4,'64.7',NULL);
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,1,NULL,'6.94');
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,2,NULL,'6.92');
INSERT INTO student_status_history (student_id,status,remarks) VALUES (@u,'Active / Enrolled','Initial record');
-- Sachin Singh
INSERT INTO users (role_id,full_name,email,phone,password_hash) VALUES (3,'Sachin Singh','sachin017@student.gpt-tanakpur.gov.in','7055843409','CHANGE_ME_HASH');
SET @u := LAST_INSERT_ID();
INSERT INTO students (user_id,ubter_roll_no,aadhar_name,aadhar_enc,aadhar_hash,branch_code,entry_type,batch,current_year,current_semester,category,gender,tenth_percentage,twelfth_percentage,full_address,mother_name,father_name) VALUES (@u,'24090020017','Sachin Singh',AES_ENCRYPT('9051 0252 7552',@aes_key),SHA2('905102527552',256),'CIVIL','Regular','2024-2027',3,5,'EWS',NULL,'54.6','60.6','Village Adhora, Post Adhora','Dhani Devi','Jagdish Singh');
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,1,'61.94','6.52');
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,2,'65.26','6.87');
INSERT INTO student_status_history (student_id,status,remarks) VALUES (@u,'Active / Enrolled','Initial record');
-- Saurabh Giri
INSERT INTO users (role_id,full_name,email,phone,password_hash) VALUES (3,'Saurabh Giri','saurabh014@student.gpt-tanakpur.gov.in','9870942886','CHANGE_ME_HASH');
SET @u := LAST_INSERT_ID();
INSERT INTO students (user_id,ubter_roll_no,aadhar_name,aadhar_enc,aadhar_hash,branch_code,entry_type,batch,current_year,current_semester,category,gender,tenth_percentage,twelfth_percentage,full_address,mother_name,father_name) VALUES (@u,'24021050014','Saurabh Giri',AES_ENCRYPT('8955 9339 0709',@aes_key),SHA2('895593390709',256),'CSE','Regular','2024-2027',3,5,'OBC',NULL,'78.7','80','Village Fushera, Post Dofar, District Bageshwar, Uttarakhand','Neema Devi','Kundan Giri');
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,1,'71.2',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,2,'75.8',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,3,'71.1',NULL);
INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (@u,4,'60.4',NULL);
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,1,'75.26','7.78');
INSERT INTO year_results (student_id,year,percentage,cgpa) VALUES (@u,2,'65.26','6.87');
INSERT INTO student_status_history (student_id,status,remarks) VALUES (@u,'Active / Enrolled','Initial record');
-- Harshvardhan Singh Patni
INSERT INTO users (role_id,full_name,email,phone,password_hash) VALUES (3,'Harshvardhan Singh Patni','harshvardhan002@student.gpt-tanakpur.gov.in','7983096250','CHANGE_ME_HASH');
SET @u := LAST_INSERT_ID();
INSERT INTO students (user_id,ubter_roll_no,aadhar_name,aadhar_enc,aadhar_hash,branch_code,entry_type,batch,current_year,current_semester,category,gender,tenth_percentage,twelfth_percentage,full_address,mother_name,father_name) VALUES (@u,'25090022002','Harshvardhan Singh Patni',NULL,NULL,'CIVIL','Lateral','2025-2027',3,5,'General',NULL,'79.2','59.4',NULL,NULL,NULL);
INSERT INTO student_status_history (student_id,status,remarks) VALUES (@u,'Active / Enrolled','Initial record');
