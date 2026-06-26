import React from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { asRecord, asString } from '@/lib/live-data';

const FIRST_ACCESS_KEY = 'showpro_company_first_access';

const validateEmail = (email: string): string | null => {
  const trimmed = email.trim();
  if (!trimmed) {
    return 'กรุณากรอกอีเมลผู้ประสานงาน';
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return 'รูปแบบอีเมลผู้ประสานงานไม่ถูกต้อง';
  }
  if (trimmed.endsWith('@company.showpro.local')) {
    return 'ไม่สามารถใช้อีเมลระบบ (@company.showpro.local) ได้ กรุณากรอกอีเมลจริง';
  }
  const blockedDomains = ['example.com', 'test.com', 'invalid.com', 'temp.com'];
  const domain = trimmed.split('@')[1]?.toLowerCase();
  if (blockedDomains.includes(domain)) {
    return `ไม่สามารถใช้อีเมลโดเมน @${domain} ได้`;
  }
  return null;
};

const requiredCompanyFields = [
  'companyName',
  'companyNameThai',
  'industry',
  'size',
  'website',
  'address',
  'contactPersonName',
  'contactPersonPhone',
  'contactPersonEmail',
];

export function CompanyOnboardingDialog() {
  const { user, updateProfile } = useAuth();
  // memoize ป้องกัน asRecord() คืน object ใหม่ทุก render → useEffect deps เปลี่ยนทุกครั้ง
  // → setState วนไม่หยุด (Maximum update depth exceeded / infinite re-render loop, D-33)
  const rawUser = React.useMemo(() => asRecord(user?.raw), [user?.raw]);
  const companyProfile = React.useMemo(() => asRecord(rawUser.companyProfile), [rawUser]);
  const isCompany = user?.role === 'company';
  const isFirstAccess =
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem(FIRST_ACCESS_KEY) === 'true';
  const missingRequiredField = requiredCompanyFields.some((field) => !asString(companyProfile[field]));
  const shouldOpen = Boolean(isCompany && (missingRequiredField || isFirstAccess));
  const [open, setOpen] = React.useState(shouldOpen);
  const [isSaving, setIsSaving] = React.useState(false);

  const getInitialEmail = () => {
    const email = asString(companyProfile.contactPersonEmail, user?.email ?? '');
    return email.endsWith('@company.showpro.local') ? '' : email;
  };

  const [formData, setFormData] = React.useState({
    companyName: asString(companyProfile.companyName),
    companyNameThai: asString(companyProfile.companyNameThai),
    industry: asString(companyProfile.industry, 'Technology'),
    size: asString(companyProfile.size, 'small'),
    website: asString(companyProfile.website),
    address: asString(companyProfile.address),
    productsServices: asString(companyProfile.productsServices),
    contactPersonName: asString(companyProfile.contactPersonName),
    contactPersonRole: asString(companyProfile.contactPersonRole, 'HR / Company Coordinator'),
    contactPersonEmail: getInitialEmail(),
    contactPersonPhone: asString(companyProfile.contactPersonPhone, user?.phone ?? ''),
    socialMedia: asString(companyProfile.socialMedia),
    newPassword: '',
  });

  React.useEffect(() => {
    setOpen(shouldOpen);
    const email = asString(companyProfile.contactPersonEmail, user?.email ?? '');
    const cleanEmail = email.endsWith('@company.showpro.local') ? '' : email;

    setFormData({
      companyName: asString(companyProfile.companyName),
      companyNameThai: asString(companyProfile.companyNameThai),
      industry: asString(companyProfile.industry, 'Technology'),
      size: asString(companyProfile.size, 'small'),
      website: asString(companyProfile.website),
      address: asString(companyProfile.address),
      productsServices: asString(companyProfile.productsServices),
      contactPersonName: asString(companyProfile.contactPersonName),
      contactPersonRole: asString(companyProfile.contactPersonRole, 'HR / Company Coordinator'),
      contactPersonEmail: cleanEmail,
      contactPersonPhone: asString(companyProfile.contactPersonPhone, user?.phone ?? ''),
      socialMedia: asString(companyProfile.socialMedia),
      newPassword: '',
    });
  }, [companyProfile, shouldOpen, user?.email, user?.phone]);

  if (!isCompany) return null;

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && shouldOpen) {
      toast.error('กรุณากรอกข้อมูลบริษัทให้ครบก่อนเข้าใช้งาน');
      void logout();
      return;
    }
    setOpen(nextOpen);
  };

  const getInputClassName = (fieldKey: string) => {
    const isRequired = requiredCompanyFields.includes(fieldKey) || (fieldKey === 'newPassword' && isFirstAccess);
    const value = fieldKey === 'newPassword' ? formData.newPassword : formData[fieldKey as keyof typeof formData];
    const isEmpty = !value || !asString(value).trim();

    if (isRequired && isEmpty) {
      return 'border-rose-500 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/20 focus-visible:ring-rose-500';
    }
    return '';
  };

  const renderLabel = (label: string, fieldKey: string) => {
    const isRequired = requiredCompanyFields.includes(fieldKey) || (fieldKey === 'newPassword' && isFirstAccess);
    return (
      <Label className="flex items-center gap-1">
        {label}
        {isRequired && <span className="text-rose-500 font-bold">*</span>}
      </Label>
    );
  };

  const handleSave = async () => {
    const missingFields = requiredCompanyFields.filter((field) => !formData[field as keyof typeof formData]?.trim());
    if (missingFields.length > 0) {
      toast.error('กรุณากรอกข้อมูลในช่องที่จำเป็น (*) ให้ครบถ้วน');
      return;
    }

    const emailError = validateEmail(formData.contactPersonEmail);
    if (emailError) {
      toast.error(emailError);
      return;
    }

    if (isFirstAccess) {
      const pwd = formData.newPassword;
      if (pwd.length < 8) {
        toast.error('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
        return;
      }
      if (!/[A-Z]/.test(pwd)) {
        toast.error('รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว');
        return;
      }
      if (!/[a-z]/.test(pwd)) {
        toast.error('รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว');
        return;
      }
      if (!/[0-9]/.test(pwd)) {
        toast.error('รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว');
        return;
      }
      if (!/[^A-Za-z0-9]/.test(pwd)) {
        toast.error('รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว (เช่น !@#$%)');
        return;
      }
    }

    setIsSaving(true);
    try {
      await updateProfile({
        name: formData.companyName,
        nameThai: formData.companyNameThai,
        phone: formData.contactPersonPhone || user?.phone,
        email: formData.contactPersonEmail,
        newPassword: formData.newPassword || undefined,
        roleData: {
          companyName: formData.companyName,
          companyNameThai: formData.companyNameThai,
          industry: formData.industry,
          size: formData.size,
          website: formData.website || undefined,
          address: formData.address || undefined,
          productsServices: formData.productsServices || undefined,
          contactPersonName: formData.contactPersonName,
          contactPersonRole: formData.contactPersonRole,
          contactPersonEmail: formData.contactPersonEmail || undefined,
          contactPersonPhone: formData.contactPersonPhone,
          socialMedia: formData.socialMedia || undefined,
          onboardingStatus: 'completed',
          privacyProtocolAcceptedAt: new Date().toISOString(),
        },
      });
      sessionStorage.removeItem(FIRST_ACCESS_KEY);
      toast.success('บันทึกข้อมูลบริษัทแล้ว');
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'บันทึกข้อมูลบริษัทไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-600" />
            กรอกข้อมูลบริษัทให้ครบ
          </DialogTitle>
          <DialogDescription>
            กรอกข้อมูลบริษัทและตั้งรหัสผ่านใหม่เพื่อใช้เข้าสู่ระบบครั้งถัดไป
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2">
              {renderLabel('ชื่อบริษัท', 'companyName')}
              <Input
                className={getInputClassName('companyName')}
                value={formData.companyName}
                onChange={(event) => updateField('companyName', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              {renderLabel('ชื่อบริษัทภาษาไทย', 'companyNameThai')}
              <Input
                className={getInputClassName('companyNameThai')}
                value={formData.companyNameThai}
                onChange={(event) => updateField('companyNameThai', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              {renderLabel('อุตสาหกรรม', 'industry')}
              <Input
                className={getInputClassName('industry')}
                value={formData.industry}
                onChange={(event) => updateField('industry', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              {renderLabel('ขนาดบริษัท', 'size')}
              <Input
                className={getInputClassName('size')}
                value={formData.size}
                onChange={(event) => updateField('size', event.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              {renderLabel('Link เว็บไซต์', 'website')}
              <Input
                className={getInputClassName('website')}
                value={formData.website}
                onChange={(event) => updateField('website', event.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              {renderLabel('ที่อยู่ของบริษัท (สามารถแปะเป็น link ได้)', 'address')}
              <Input
                className={getInputClassName('address')}
                value={formData.address}
                onChange={(event) => updateField('address', event.target.value)}
                placeholder="กรอกที่อยู่ หรือแปะลิงก์แผนที่ (เช่น Google Maps)"
              />
            </div>
            <div className="space-y-2">
              {renderLabel('ผู้ประสานงาน', 'contactPersonName')}
              <Input
                className={getInputClassName('contactPersonName')}
                value={formData.contactPersonName}
                onChange={(event) => updateField('contactPersonName', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              {renderLabel('เบอร์ผู้ประสานงาน', 'contactPersonPhone')}
              <Input
                className={getInputClassName('contactPersonPhone')}
                value={formData.contactPersonPhone}
                onChange={(event) => updateField('contactPersonPhone', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              {renderLabel('อีเมลผู้ประสานงาน', 'contactPersonEmail')}
              <Input
                className={getInputClassName('contactPersonEmail')}
                value={formData.contactPersonEmail}
                onChange={(event) => updateField('contactPersonEmail', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              {renderLabel('ตำแหน่งผู้ประสานงาน', 'contactPersonRole')}
              <Input
                className={getInputClassName('contactPersonRole')}
                value={formData.contactPersonRole}
                onChange={(event) => updateField('contactPersonRole', event.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              {renderLabel('รหัสผ่านใหม่', 'newPassword')}
              <Input
                className={getInputClassName('newPassword')}
                type="password"
                value={formData.newPassword}
                onChange={(event) => updateField('newPassword', event.target.value)}
                placeholder="อย่างน้อย 8 ตัว (พิมพ์ใหญ่, พิมพ์เล็ก, ตัวเลข, อักขระพิเศษ)"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            บันทึกข้อมูล
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
