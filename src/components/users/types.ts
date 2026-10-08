export type UserType = 'student' | 'lecturer' | 'staff' | 'company' | 'admin';

export type UserRow = {
  id: string;
  name: string;
  email?: string;
  type: UserType;
  roleLabel: string;
  image?: string;
  isActive?: boolean;
  nameThai?: string;
  /** the stored English name; `name` is the display name (Thai first) */
  nameEn?: string;
  phone?: string;
  identifier?: string;
  department?: string;
  position?: string;
  major?: string;
  program?: string;
  year?: number;
  semester?: number;
  academicYear?: string;
  companyName?: string;
  companyNameThai?: string;
  industry?: string;
  size?: string;
  website?: string;
  address?: string;
  locationMapUrl?: string;
  productsServices?: string;
  contactPersonName?: string;
  contactPersonRole?: string;
  contactPersonEmail?: string;
  contactPersonPhone?: string;
  socialMedia?: string;
  lastLogin?: string;
  [key: string]: unknown;
};
