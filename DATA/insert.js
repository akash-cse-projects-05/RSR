require("dotenv").config({
    path: require("path").resolve(__dirname, "../.env")
});

const mongoose = require("mongoose");
const Employee = require("../models/Employee"); // correct path

// ✅ Correct env variable
const MONGODB_URI = process.env.MONGODB_URI;

const employeesData = [
    {
        "employeeCode": "RSR/DIR/002",
        "firstName": "Suresh",
        "lastName": "Rahangdale",
        "dob": "1988-06-24T00:00:00.000Z",
        "email": "suresh@rsraviation.com",
        "status": "Active",
        "phoneNumber": "9595475981",
        "department": "Director",
        "designation": "Director",
        "employmentType": "Full-Time",
        "joiningDate": "2022-05-23T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/DIR/001",
        "firstName": "Reena",
        "lastName": "Paigude",
        "dob": "1989-10-18T00:00:00.000Z",
        "email": "reena@rsraviation.com",
        "status": "Active",
        "phoneNumber": "9699012337",
        "department": "Director",
        "designation": "Director",
        "employmentType": "Full-Time",
        "joiningDate": "2022-05-23T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/043",
        "firstName": "Pulak",
        "lastName": "Sen",
        "dob": "1957-12-22T00:00:00.000Z",
        "email": "pulak.sen@rsraviaion.com",
        "status": "Active",
        "phoneNumber": "9920775478",
        "department": "Business Development",
        "designation": "VP- Business Development & Promotion",
        "employmentType": "Full-Time",
        "joiningDate": "2025-04-07T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/045",
        "firstName": "Nimish",
        "lastName": "Kadam",
        "dob": "1978-05-23T00:00:00.000Z",
        "email": "nimish@rsraviation",
        "status": "Active",
        "phoneNumber": "8433885233",
        "department": "Business Development & SCM",
        "designation": "VP- Business Development & SCM",
        "employmentType": "Full-Time",
        "joiningDate": "2025-07-01T00:00:00.000Z",
        "workLocation": "Onsite- Jogeshwari",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/044",
        "firstName": "Puneet",
        "lastName": "Virdi",
        "dob": "1988-08-30T00:00:00.000Z",
        "email": "puneet@rsraviation.com",
        "status": "Active",
        "phoneNumber": "9873678145",
        "department": "Business Development",
        "designation": "Business Development Manager- Aerospace",
        "employmentType": "Full-Time",
        "joiningDate": "2025-06-16T00:00:00.000Z",
        "workLocation": "Hybrid",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/046",
        "firstName": "Ramesh",
        "lastName": "Karra",
        "dob": "1989-02-02T00:00:00.000Z",
        "email": "rkkarra@rsravaiation.com",
        "status": "Inactive",
        "phoneNumber": "8125205878",
        "department": "Business Development",
        "designation": "General Manager - BD",
        "employmentType": "Full-Time",
        "joiningDate": "2025-07-21T00:00:00.000Z",
        "workLocation": "Hybrid",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/001",
        "firstName": "Sarika",
        "lastName": "Malusare",
        "dob": "1995-04-17T00:00:00.000Z",
        "email": "sarika@rsraviation.com",
        "status": "Active",
        "phoneNumber": "9987154309",
        "department": "Quality & Stores",
        "designation": "General Manager- Quality & Stores",
        "employmentType": "Full-Time",
        "joiningDate": "2022-06-10T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/002",
        "firstName": "Shubham",
        "lastName": "Rahangdale",
        "dob": "1994-06-21T00:00:00.000Z",
        "email": "shubham.rahangdale@rsraviation.com",
        "status": "Active",
        "phoneNumber": "7400064950",
        "department": "Sales",
        "designation": "Head of Sales & Marketing",
        "employmentType": "Full-Time",
        "joiningDate": "2022-07-01T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/003",
        "firstName": "Aaradhaya",
        "lastName": "Dakare",
        "dob": "1993-09-03T00:00:00.000Z",
        "email": "info@rsraviation.com",
        "status": "Active",
        "phoneNumber": "8850193303",
        "department": "Outward",
        "designation": "HOD- Outward",
        "employmentType": "Full-Time",
        "joiningDate": "2023-01-01T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/004",
        "firstName": "Harshada",
        "lastName": "Gavkar",
        "dob": "1992-08-25T00:00:00.000Z",
        "email": "accounts@rsraviation.com",
        "status": "Active",
        "phoneNumber": "9664555493",
        "department": "Accounts",
        "designation": "Accounts Head",
        "employmentType": "Full-Time",
        "joiningDate": "2023-06-01T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/005",
        "firstName": "Darshana",
        "lastName": "Mahadik",
        "dob": "1999-12-18T00:00:00.000Z",
        "email": "darshanamahadik@rsraviation.com",
        "status": "Active",
        "phoneNumber": "7350327789",
        "department": "Purchase",
        "designation": "Procurement Executive",
        "employmentType": "Full-Time",
        "joiningDate": "2024-02-01T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/007",
        "firstName": "Karishma",
        "lastName": "Chourasiya",
        "dob": "2004-01-09T00:00:00.000Z",
        "email": "karishma@rsraviation.com",
        "status": "Active",
        "phoneNumber": "7718935233",
        "department": "Logistics & Clearance",
        "designation": "Logistics & Clearance- Execuitve",
        "employmentType": "Full-Time",
        "joiningDate": "2024-07-01T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/010",
        "firstName": "Narendra",
        "lastName": "Genolia",
        "dob": "1993-11-14T00:00:00.000Z",
        "email": "narendra@rsraviation.com",
        "status": "Inactive",
        "phoneNumber": "8655523094",
        "department": "Purchase & Sales",
        "designation": "General Manager- Purchase & Sales",
        "employmentType": "Full-Time",
        "joiningDate": "2024-07-05T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/011",
        "firstName": "Mrunali",
        "lastName": "Dhargave",
        "dob": "1989-09-10T00:00:00.000Z",
        "email": "mrunali@rsraviation.com",
        "status": "Active",
        "phoneNumber": "8698551853",
        "department": "Sales",
        "designation": "Assistant General Manager- Sales & Defence",
        "employmentType": "Full-Time",
        "joiningDate": "2024-07-05T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/012",
        "firstName": "Anandkumar",
        "lastName": "Yadav",
        "dob": "1999-03-25T00:00:00.000Z",
        "email": "kanand@rsraviation.com",
        "status": "Active",
        "phoneNumber": "8691875506",
        "department": "Sales",
        "designation": "Senior Sales Executive",
        "employmentType": "Full-Time",
        "joiningDate": "2024-07-05T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/013",
        "firstName": "Shivam",
        "lastName": "Tiwari",
        "dob": "1999-11-19T00:00:00.000Z",
        "email": "tshivam@rsraviation.com",
        "status": "Active",
        "phoneNumber": "8767883780",
        "department": "Sales",
        "designation": "Sales Executive",
        "employmentType": "Full-Time",
        "joiningDate": "2024-07-05T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/014",
        "firstName": "Madhuri",
        "lastName": "Badwaik",
        "dob": "1994-08-10T00:00:00.000Z",
        "email": "bmadhuri@rsraviation.com",
        "status": "Active",
        "phoneNumber": "7385179607",
        "department": "Sales",
        "designation": "Sales Executive",
        "employmentType": "Full-Time",
        "joiningDate": "2024-07-05T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/015",
        "firstName": "Rohini",
        "lastName": "Maya Bijaya",
        "dob": "1997-06-05T00:00:00.000Z",
        "email": "office@rsraviation.com",
        "status": "Active",
        "phoneNumber": "8425821289",
        "department": "Admin",
        "designation": "Admin Executive",
        "employmentType": "Full-Time",
        "joiningDate": "2024-07-05T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/019",
        "firstName": "Swapnil",
        "lastName": "Mishra",
        "dob": "1999-09-28T00:00:00.000Z",
        "email": "swapnil@rsraviation.com",
        "status": "Active",
        "phoneNumber": "7007517077",
        "department": "Business Development",
        "designation": "Business Development Manager",
        "employmentType": "Full-Time",
        "joiningDate": "2024-07-05T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/020",
        "firstName": "Rishab",
        "lastName": "Yadav",
        "dob": "2002-10-10T00:00:00.000Z",
        "email": "info@revvaerospace.com",
        "status": "Active",
        "phoneNumber": "9969450996",
        "department": "Revv",
        "designation": "Revv Operations Head",
        "employmentType": "Full-Time",
        "joiningDate": "2024-07-23T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/021",
        "firstName": "Rushikesh",
        "lastName": "Gund",
        "dob": "2001-03-29T00:00:00.000Z",
        "email": "it@rsraviation.com",
        "status": "Active",
        "phoneNumber": "6303216544",
        "department": "IT",
        "designation": "Software Developver",
        "employmentType": "Full-Time",
        "joiningDate": "2024-09-04T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/023",
        "firstName": "Sunny",
        "lastName": "Gupta",
        "dob": "2001-03-21T00:00:00.000Z",
        "email": "quality@rsraviation.com",
        "status": "Active",
        "phoneNumber": "8591278121",
        "department": "Quality",
        "designation": "Quality Assistant",
        "employmentType": "Full-Time",
        "joiningDate": "2024-09-19T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/025",
        "firstName": "Saurabh",
        "lastName": "Yadav",
        "dob": "1993-07-03T00:00:00.000Z",
        "email": "outward@rsraviation.com",
        "status": "Active",
        "phoneNumber": "8953090800",
        "department": "Outward",
        "designation": "Dispatch Coordinator",
        "employmentType": "Full-Time",
        "joiningDate": "2024-10-01T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/027",
        "firstName": "Anshika",
        "lastName": "Sharma",
        "dob": "2002-12-01T00:00:00.000Z",
        "email": "marketing@rsraviation.com",
        "status": "Inactive",
        "phoneNumber": "9326401763",
        "department": "Digital Marketing",
        "designation": "Digital Marketing Executive",
        "employmentType": "Full-Time",
        "joiningDate": "2024-11-04T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/029",
        "firstName": "Aditya",
        "lastName": "Deshmukh",
        "dob": "2003-01-14T00:00:00.000Z",
        "email": "inward@rsraviation.com",
        "status": "Active",
        "phoneNumber": "8483849518",
        "department": "Inward",
        "designation": "Inward Executive",
        "employmentType": "Full-Time",
        "joiningDate": "2024-12-02T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/032",
        "firstName": "Sameer",
        "lastName": "Khan",
        "dob": "2004-08-20T00:00:00.000Z",
        "email": "info@revvaerospace.com",
        "status": "Active",
        "phoneNumber": "8587919842",
        "department": "Revv",
        "designation": "Revv Operations Head",
        "employmentType": "Full-Time",
        "joiningDate": "2025-01-13T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/034",
        "firstName": "Sanjay",
        "lastName": "Kadalak",
        "dob": "1993-07-13T00:00:00.000Z",
        "email": "billing@rsraviation.com",
        "status": "Active",
        "phoneNumber": "8828258925",
        "department": "Accounts",
        "designation": "Accountant",
        "employmentType": "Full-Time",
        "joiningDate": "2025-01-20T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/035",
        "firstName": "Sayali",
        "lastName": "Jadhav",
        "dob": "1997-07-02T00:00:00.000Z",
        "email": "einvoice@rsraviation.com",
        "status": "Active",
        "phoneNumber": "8975007190", "department": "Accounts",
        "designation": "Accountant",
        "employmentType": "Full-Time",
        "joiningDate": "2025-02-24T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/037",
        "firstName": "Aditi",
        "lastName": "Dwivedi",
        "dob": "2000-08-23T00:00:00.000Z",
        "email": "hr@rsraviation.com",
        "status": "Active",
        "phoneNumber": "8692040293",
        "department": "HR",
        "designation": "HR Manager",
        "employmentType": "Full-Time",
        "joiningDate": "2025-03-26T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/038",
        "firstName": "Gaurav",
        "lastName": "Thakkar",
        "dob": "1978-05-23T00:00:00.000Z",
        "email": "gaurav@rsraviation.com",
        "status": "Active",
        "phoneNumber": "8433681920",
        "department": "Purchase & Logistics",
        "designation": "SCM Head",
        "employmentType": "Full-Time",
        "joiningDate": "2025-07-01T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/041",
        "firstName": "Ashutosh",
        "lastName": "Bade",
        "dob": "2000-11-28T00:00:00.000Z",
        "email": "chemist@rsraviation.com",
        "status": "Active",
        "phoneNumber": "8975752296",
        "department": "Manufacturing",
        "designation": "Paints & Coating Manufacturing Specialist",
        "employmentType": "Full-Time",
        "joiningDate": "2025-04-15T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/039",
        "firstName": "Sahil",
        "lastName": "Kalambe",
        "dob": "2002-07-31T00:00:00.000Z",
        "email": "stores@rsraviation.com",
        "status": "Active",
        "phoneNumber": "9004188490",
        "department": "Inward",
        "designation": "Store Executive",
        "employmentType": "Full-Time",
        "joiningDate": "2025-04-03T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/006",
        "firstName": "Nikita",
        "lastName": "Gayakwad",
        "dob": "2002-07-04T00:00:00.000Z",
        "email": "hr@rsraviation.com",
        "status": "Active",
        "phoneNumber": "8451815941",
        "department": "House Keeping",
        "designation": "House Keeping",
        "employmentType": "Full-Time",
        "joiningDate": "2024-05-01T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/008",
        "firstName": "Bharat",
        "lastName": "Gaikwad",
        "dob": "1985-10-10T00:00:00.000Z",
        "email": "stores@rsraviation.com",
        "status": "Active",
        "phoneNumber": "9594594778",
        "department": "Stores",
        "designation": "Store Assistant",
        "employmentType": "Full-Time",
        "joiningDate": "2023-06-01T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/009",
        "firstName": "Vishal",
        "lastName": "Khatri",
        "dob": "1996-07-17T00:00:00.000Z",
        "email": "stores@rsraviation.com",
        "status": "Inactive",
        "phoneNumber": "9137968170",
        "department": "Stores",
        "designation": "Driver",
        "employmentType": "Full-Time",
        "joiningDate": "2024-06-14T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/016",
        "firstName": "Shivaji",
        "lastName": "Mali",
        "dob": "1986-05-11T00:00:00.000Z",
        "email": "stores@rsraviation.com",
        "status": "Active",
        "phoneNumber": "9167765352",
        "department": "Stores",
        "designation": "Store Assistant",
        "employmentType": "Full-Time",
        "joiningDate": "2024-07-05T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/017",
        "firstName": "Santosh",
        "lastName": "Marne",
        "dob": "1988-08-19T00:00:00.000Z",
        "email": "stores@rsraviation.com",
        "status": "Active",
        "phoneNumber": "9594470608",
        "department": "Stores",
        "designation": "Store Assistant",
        "employmentType": "Full-Time",
        "joiningDate": "2024-07-05T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/018",
        "firstName": "Ashok",
        "lastName": "Chaupal",
        "dob": "1986-01-01T00:00:00.000Z",
        "email": "stores@rsraviation.com",
        "status": "Active",
        "phoneNumber": "9326549436",
        "department": "Stores",
        "designation": "Driver",
        "employmentType": "Full-Time",
        "joiningDate": "2024-07-05T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/026",
        "firstName": "B",
        "lastName": "Babu",
        "dob": "2002-08-20T00:00:00.000Z",
        "email": "hr@rsraviation.com",
        "status": "Active",
        "phoneNumber": "8591069485",
        "department": "House Keeping",
        "designation": "House Keeping",
        "employmentType": "Full-Time",
        "joiningDate": "2024-10-01T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/033",
        "firstName": "Nita",
        "lastName": "Mukate",
        "dob": "1985-01-01T00:00:00.000Z",
        "email": "hr@rsraviation.com",
        "status": "Active",
        "phoneNumber": "8591719038",
        "department": "House Keeping",
        "designation": "House Keeping",
        "employmentType": "Full-Time",
        "joiningDate": "2025-02-11T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/036",
        "firstName": "Anil",
        "lastName": "Khatri",
        "dob": "2006-01-06T00:00:00.000Z",
        "email": "hr@rsraviation.com",
        "status": "Active",
        "phoneNumber": "9326677822",
        "department": "House Keeping",
        "designation": "House Keeping",
        "employmentType": "Full-Time",
        "joiningDate": "2025-02-14T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/051",
        "firstName": "Mukta",
        "lastName": "",
        "dob": "1981-04-20T00:00:00.000Z",
        "email": "billing@rsraviation.com",
        "status": "Active",
        "phoneNumber": "9137941137",
        "department": "Dispatch",
        "designation": "E- invoice executive",
        "employmentType": "Contract",
        "joiningDate": "2025-08-13T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/050",
        "firstName": "Amarjeet",
        "lastName": "Singh",
        "dob": "2002-10-22T00:00:00.000Z",
        "email": "logistics@rsraviation.com",
        "status": "Active",
        "phoneNumber": "8847049969",
        "department": "Logistics & Clearance",
        "designation": "Logistics & Clearance- Trainee",
        "employmentType": "Contract",
        "joiningDate": "2025-08-21T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/057",
        "firstName": "Sandeep",
        "lastName": "",
        "dob": "1990-01-01T00:00:00.000Z",
        "email": "stores@rsraviation.com",
        "status": "Inactive",
        "phoneNumber": "8169033486",
        "department": "Stores",
        "designation": "Store Assistant",
        "employmentType": "Full-Time",
        "joiningDate": "2025-09-09T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/022",
        "firstName": "Rahul",
        "lastName": "Malviya",
        "dob": "1980-01-01T00:00:00.000Z",
        "email": "scm@rsraviation.com",
        "status": "Inactive",
        "phoneNumber": "9621607661",
        "department": "Purchase & Logistics",
        "designation": "SCM Head",
        "employmentType": "Full-Time",
        "joiningDate": "2024-09-09T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/047",
        "firstName": "Jayanti",
        "lastName": "Roy",
        "dob": "1991-01-01T00:00:00.000Z",
        "email": "jayanti@rsravaition.com",
        "status": "Inactive",
        "phoneNumber": "9958693016",
        "department": "Sales",
        "designation": "Sales Executive",
        "employmentType": "Full-Time",
        "joiningDate": "2025-08-01T00:00:00.000Z",
        "workLocation": "Hybrid",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/052",
        "firstName": "Tejas",
        "lastName": "Wable",
        "dob": "1995-01-01T00:00:00.000Z",
        "email": "tejaswable@rsraviation.com",
        "status": "Active",
        "phoneNumber": "7738661137",
        "department": "Sales",
        "designation": "Sales Executive",
        "employmentType": "Full-Time",
        "joiningDate": "2024-01-01T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/055",
        "firstName": "Ashish",
        "lastName": "Pandey",
        "dob": "1998-01-01T00:00:00.000Z",
        "email": "ashishpandey@rsraviation.com",
        "status": "Active",
        "phoneNumber": "7738282337",
        "department": "Assistant SCM",
        "designation": "Purchase",
        "employmentType": "Full-Time",
        "joiningDate": "2025-10-14T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/040",
        "firstName": "Chandrakant",
        "lastName": "",
        "dob": "1990-01-01T00:00:00.000Z",
        "email": "stores@rsraviation.com",
        "status": "Inactive",
        "phoneNumber": "0000000000",
        "department": "Stores",
        "designation": "Stores Executive",
        "employmentType": "Full-Time",
        "joiningDate": "2025-04-16T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/058",
        "firstName": "Naga",
        "lastName": "Srinivas",
        "dob": "1985-01-01T00:00:00.000Z",
        "email": "nagasrinivasd@rsraviation.com",
        "status": "Active",
        "phoneNumber": "9177162096",
        "department": "SCM & Purchase",
        "designation": "Associate General Manager- SCM",
        "employmentType": "Full-Time",
        "joiningDate": "2025-12-01T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/054",
        "firstName": "Tejas",
        "lastName": "Dhepe",
        "dob": "1998-01-01T00:00:00.000Z",
        "email": "admin@rsraviation.com",
        "status": "Active",
        "phoneNumber": "9082757101",
        "department": "Admin",
        "designation": "Admin Executive",
        "employmentType": "Full-Time",
        "joiningDate": "2025-12-01T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/059",
        "firstName": "Shankit",
        "lastName": "Mukherjee",
        "dob": "2000-01-01T00:00:00.000Z",
        "email": "shankit.mukherjee@rsraviation.com",
        "status": "Active",
        "phoneNumber": "0000000000",
        "department": "Sales",
        "designation": "Sales Trainee",
        "employmentType": "Full-Time",
        "joiningDate": "2025-12-15T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/060",
        "firstName": "Dakshata",
        "lastName": "Malpekar",
        "dob": "2001-01-01T00:00:00.000Z",
        "email": "dakshatamalpekar@rsraviation.com",
        "status": "Active",
        "phoneNumber": "0000000000",
        "department": "Outward",
        "designation": "Outward Trainee",
        "employmentType": "Contract",
        "joiningDate": "2024-01-01T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/061",
        "firstName": "Radhika",
        "lastName": "Srivastav",
        "dob": "2003-01-01T00:00:00.000Z",
        "email": "radhikasrivastav@rsraviation.com",
        "status": "Active",
        "phoneNumber": "0000000000",
        "department": "Stores & Inward",
        "designation": "Receiving Inspector Intern",
        "employmentType": "Intern",
        "joiningDate": "2026-01-05T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    },
    {
        "employeeCode": "RSR/EMP/062",
        "firstName": "Omkar",
        "lastName": "Waghmare",
        "dob": "2002-01-01T00:00:00.000Z",
        "email": "stores@rsraviation.com",
        "status": "Active",
        "phoneNumber": "0000000000",
        "department": "Stores & Inward",
        "designation": "Receiving Inspector Intern",
        "employmentType": "Intern",
        "joiningDate": "2026-02-02T00:00:00.000Z",
        "workLocation": "Onsite- Taloja",
        "reportingManager": null
    }
];

const User = require("../models/User");

async function seedEmployees() {
    try {
        if (!MONGODB_URI) {
            throw new Error("MONGODB_URI not found in .env file");
        }

        await mongoose.connect(MONGODB_URI);

        console.log("✅ Connected to MongoDB Atlas");

        // Convert string dates → Date objects
        const formattedEmployees = employeesData.map(emp => ({
            ...emp,
            dob: new Date(emp.dob),
            joiningDate: new Date(emp.joiningDate)
        }));

        // 1. Insert Employees
        // We use insertMany with { ordered: false } to continue even if some fail (e.g. duplicates)
        // But to link Users, we need the _id. insertMany returns the documents.
        let insertedEmployees;
        try {
            insertedEmployees = await Employee.insertMany(formattedEmployees, { ordered: false });
            console.log(`✅ Inserted ${insertedEmployees.length} employees.`);
        } catch (e) {
            // capturing inserted docs from error if partial success
            if (e.writeErrors) {
                console.warn(`⚠️ Some employees failed to insert (likely duplicates). Inserted count: ${e.insertedDocs.length}`);
                insertedEmployees = e.insertedDocs;
            } else {
                throw e;
            }
        }

        if (!insertedEmployees || insertedEmployees.length === 0) {
            console.log("No new employees inserted. Checking for existing employees to ensure users exist...");
            // If we want to ensure users exist for ALL employees in the list (even if they already existed in DB)
            // we might need to fetch them.
            // For now, let's assume valid flow is fresh insert or we can fetch by employeeCode.
            const codes = formattedEmployees.map(e => e.employeeCode);
            insertedEmployees = await Employee.find({ employeeCode: { $in: codes } });
        }


        // 2. Create/Sync Users
        let userCount = 0;
        for (const emp of insertedEmployees) {
            try {
                // Check if user exists
                const existingUser = await User.findOne({ username: emp.employeeCode });

                if (!existingUser) {
                    // Create new user
                    // Password defaults to employeeCode
                    const newUser = new User({
                        employeeId: emp._id,
                        username: emp.employeeCode,
                        password: emp.employeeCode, // Will be hashed by pre-save hook
                        isFirstLogin: true
                    });

                    await newUser.save();
                    userCount++;
                    // console.log(`   + User created for ${emp.employeeCode}`);
                } else {
                    // Update linkage if missing? 
                    if (!existingUser.employeeId) {
                        existingUser.employeeId = emp._id;
                        await existingUser.save();
                        console.log(`   * Re-linked User for ${emp.employeeCode}`);
                    }
                }
            } catch (err) {
                console.error(`   ❌ Failed to create user for ${emp.employeeCode}:`, err.message);
            }
        }

        console.log(`✅ Users processed. Created: ${userCount}`);
        process.exit(0);

    } catch (error) {
        console.error("❌ Error seeding database:", error);
        process.exit(1);
    }
}

seedEmployees();
