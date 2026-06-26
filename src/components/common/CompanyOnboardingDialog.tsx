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

const requiredCompanyFields = [
  'companyName',
  'companyNameThai',
  'industry',
  'size',
  'contactPersonName',
  'contactPersonPhone',
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
    contactPersonEmail: asString(companyProfile.contactPersonEmail, user?.email ?? ''),
    contactPersonPhone: asString(companyProfile.contactPersonPhone, user?.phone ?? ''),
    socialMedia: asString(companyProfile.socialMedia),
    newPassword: '',
  });

  React.useEffect(() => {
    setOpen(shouldOpen);
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
      contactPersonEmail: asString(companyProfile.contactPersonEmail, user?.email ?? ''),
      contactPersonPhone: asString(companyProfile.contactPersonPhone, user?.phone ?? ''),
      socialMedia: asString(companyProfile.socialMedia),
      newPassword: '',
    });
  }, [companyProfile, shouldOpen, user?.email, user?.phone]);

  if (!isCompany) return null;

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    if (isFirstAccess && formData.newPassword.length < 8) {
      toast.error('กรุณาตั้งรหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        name: formData.companyName,
        nameThai: formData.companyNameThai,
        phone: formData.contactPersonPhone || user?.phone,
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-600" />
            กรอกข้อมูลบริษัทให้ครบ
          </DialogTitle>
          <DialogDescription>
            กรอกข้อมูลบริษัทและตั้งรหัสผ่านใหม่เพื่อใช้เข้าสู่ระบบครั้งถัดไป
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 md:grid-cols-2">
          <div className="space-y-2">
            <Label>ชื่อบริษัท</Label>
            <Input value={formData.companyName} onChange={(event) => updateField('companyName', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>ชื่อบริษัทภาษาไทย</Label>
            <Input value={formData.companyNameThai} onChange={(event) => updateField('companyNameThai', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>อุตสาหกรรม</Label>
            <Input value={formData.industry} onChange={(event) => updateField('industry', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>ขนาดบริษัท</Label>
            <Input value={formData.size} onChange={(event) => updateField('size', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>ผู้ประสานงาน</Label>
            <Input value={formData.contactPersonName} onChange={(event) => updateField('contactPersonName', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>เบอร์ผู้ประสานงาน</Label>
            <Input value={formData.contactPersonPhone} onChange={(event) => updateField('contactPersonPhone', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>อีเมลผู้ประสานงาน</Label>
            <Input value={formData.contactPersonEmail} onChange={(event) => updateField('contactPersonEmail', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>ตำแหน่งผู้ประสานงาน</Label>
            <Input value={formData.contactPersonRole} onChange={(event) => updateField('contactPersonRole', event.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>รหัสผ่านใหม่</Label>
            <Input
              type="password"
              value={formData.newPassword}
              onChange={(event) => updateField('newPassword', event.target.value)}
              placeholder="อย่างน้อย 8 ตัวอักษร"
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            บันทึกข้อมูล
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
