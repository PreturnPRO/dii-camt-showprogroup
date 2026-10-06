import { asRecord, asString, roleToClient } from '@/lib/live-data';
import type { UserRow, UserType } from './types';

export function mapBackendUser(item: unknown, getRoleText: (role: UserType) => string): UserRow {
  const source = asRecord(item);
  const role = roleToClient(source.role) as UserType;
  const studentProfile = asRecord(source.studentProfile);
  const lecturerProfile = asRecord(source.lecturerProfile);
  const staffProfile = asRecord(source.staffProfile);
  const companyProfile = asRecord(source.companyProfile);
  const profileName =
    role === 'company'
      ? asString(companyProfile.companyNameThai, asString(companyProfile.companyName))
      : '';
  const identifier =
    role === 'student'
      ? asString(studentProfile.studentId)
      : role === 'lecturer'
      ? asString(lecturerProfile.lecturerId)
      : role === 'staff'
      ? asString(staffProfile.staffId)
      : asString(companyProfile.companyId);
  const department =
    role === 'lecturer'
      ? asString(lecturerProfile.department)
      : asString(staffProfile.department);
  const position =
    role === 'lecturer'
      ? asString(lecturerProfile.position)
      : asString(staffProfile.position);

  return {
    ...source,
    id: asString(source.id),
    name: asString(profileName, asString(source.nameThai, asString(source.name, source.email as string))),
    email: asString(source.email),
    type: role,
    roleLabel: getRoleText(role),
    image: asString(source.avatar),
    isActive: source.isActive !== false,
    nameThai: asString(source.nameThai),
    phone: asString(source.phone),
    identifier,
    department,
    position,
    major: asString(studentProfile.major),
    program: asString(studentProfile.program),
    year: Number(studentProfile.year ?? 1),
    semester: Number(studentProfile.semester ?? 1),
    academicYear: asString(studentProfile.academicYear),
    companyName: asString(companyProfile.companyName),
    companyNameThai: asString(companyProfile.companyNameThai),
    industry: asString(companyProfile.industry),
    size: asString(companyProfile.size),
    website: asString(companyProfile.website),
    address: asString(companyProfile.address),
    locationMapUrl: asString(companyProfile.locationMapUrl),
    productsServices: asString(companyProfile.productsServices),
    contactPersonName: asString(companyProfile.contactPersonName),
    contactPersonRole: asString(companyProfile.contactPersonRole),
    contactPersonEmail: asString(companyProfile.contactPersonEmail),
    contactPersonPhone: asString(companyProfile.contactPersonPhone),
    socialMedia: asString(companyProfile.socialMedia),
    lastLogin: source.lastLogin ? String(source.lastLogin) : undefined,
    studentProfile,
    lecturerProfile,
    staffProfile,
    companyProfile,
  };
}
