const teams = [
  ["Senior Java Developer", "Hyderabad", ["Java", "Spring Boot", "AWS"], "Fintech", "Java Developer", "AWS Solutions Architect"],
  ["Java Backend Developer", "Hyderabad", ["Java", "Spring Boot", "PostgreSQL"], "Fintech", "Java Developer", "Oracle Certified Professional"],
  ["Java Developer", "Pune", ["Java", "Quarkus", "Azure"], "Logistics", "Backend Developer", "Azure Developer Associate"],
  ["JavaScript Developer", "Hyderabad", ["JavaScript", "Node.js", "AWS"], "E-commerce", "Frontend Developer", "AWS Cloud Practitioner"],
  ["Senior Python Developer", "Bengaluru", ["Python", "FastAPI", "PostgreSQL"], "Healthcare", "Data Engineer", "Google Cloud Digital Leader"],
  ["Platform Engineer", "Chennai", ["Go", "Kubernetes", "AWS"], "Cloud Infrastructure", "Site Reliability Engineer", "CKA"],
];
const names = ["Asha Nair", "Neel Rao", "Meera Iyer", "Dev Shah", "Riya Sen", "Kabir Jain", "Sana Mir", "Rohan Das"];
const limits = [15, 30, 31, 60, null, 0, 45, 30];

export const fixtures = teams.flatMap(([roleTitle, city, skills, industry, pastRole, cert], team) =>
  names.map((displayName, index) => ({
    key: team * names.length + index,
    displayName: team === 0 ? displayName : `${displayName.split(" ")[0]} ${["Kapoor", "Thomas", "Menon", "Bose", "Kulkarni"][team - 1]}`,
    roleTitle, city, industry,
    skills: index === 6 && team > 0 ? null : skills,
    pastRoles: index === 6 ? [] : [pastRole],
    certifications: index % 3 === 0 ? [cert] : [],
    education: index === 6 ? null : index % 2 ? "B.Tech Computer Science" : "BCA",
    employmentType: index === 7 ? "Contract" : "Full-time",
    experienceMonths: team === 0 ? [72, 120, 96, 96, 96, 71, 121, 96][index] : [24, 48, 60, 84, 96, 132, null, 100][index],
    noticePeriodDays: limits[index],
  })),
);
