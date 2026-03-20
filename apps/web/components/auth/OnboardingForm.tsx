"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Briefcase, 
  MapPin, 
  Camera, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Upload, 
  Loader2,
  X,
  Phone,
  Mail,
  Calendar,
  ShieldCheck,
  Search
} from "lucide-react";
import { API_BASE_URL, getToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { CANADA_CITIES } from "@/lib/constants";

interface OnboardingFormProps {
  onComplete: () => void;
}


export default function OnboardingForm({ onComplete }: OnboardingFormProps): React.JSX.Element {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [marketSearchText, setMarketSearchText] = useState("");
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    businessName: "",
    licenseNumber: "",
    phoneNumber: "",
    address: "",
    professionalEmail: "",
    yearsInBusiness: 0,
    calendlyLink: "",
    markets: [] as string[],
    signatureImageUrl: "",
    brandLogoUrl: "",
    brokerageLogoUrl: "",
    brokerageName: "",
    subscriptionPlan: "free",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUploadField, setCurrentUploadField] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateStep = (currentStep: number) => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.firstName.trim()) newErrors.firstName = "Required";
      if (!formData.lastName.trim()) newErrors.lastName = "Required";
      if (!formData.businessName.trim()) newErrors.businessName = "Required";
      if (!formData.licenseNumber.trim()) newErrors.licenseNumber = "Required";
      if (!formData.address.trim()) newErrors.address = "Required";
      // Calendly no longer mandatory
      if (formData.yearsInBusiness < 0) newErrors.yearsInBusiness = "Cannot be negative";
      
      const phoneRegex = /^\+?[\d\s-]{10,}$/;
      if (!formData.phoneNumber.trim()) {
        newErrors.phoneNumber = "Required";
      } else if (!phoneRegex.test(formData.phoneNumber)) {
        newErrors.phoneNumber = "Invalid format";
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!formData.professionalEmail.trim()) {
        newErrors.professionalEmail = "Required";
      } else if (!emailRegex.test(formData.professionalEmail)) {
        newErrors.professionalEmail = "Invalid email";
      }
    } else if (currentStep === 2) {
      if (formData.markets.length === 0) {
        newErrors.markets = "Select at least one market";
      }
    } else if (currentStep === 3) {
      if (!formData.brokerageName.trim()) newErrors.brokerageName = "Required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleMarketToggle = (city: string) => {
    setFormData(prev => {
      const updatedMarkets = prev.markets.includes(city)
        ? prev.markets.filter(c => c !== city)
        : [...prev.markets, city];
      
      if (updatedMarkets.length > 0 && errors.markets) {
        setErrors(prevErrors => {
          const newErrors = { ...prevErrors };
          delete newErrors.markets;
          return newErrors;
        });
      }
      
      return { ...prev, markets: updatedMarkets };
    });
  };

  const triggerUpload = (field: string) => {
    setCurrentUploadField(field);
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUploadField) return;

    setUploadingField(currentUploadField);
    const body = new FormData();
    body.append("file", file);

    try {
      const res = await fetch(`${API_BASE_URL}/upload/image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      
      setFormData(prev => ({ ...prev, [currentUploadField]: data.url }));
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploadingField(null);
      setCurrentUploadField(null);
    }
  };

  const handleSubmit = async () => {
    // Final comprehensive validation
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      // Find the first step with errors and go there
      if (!validateStep(1)) setStep(1);
      else if (!validateStep(2)) setStep(2);
      else if (!validateStep(3)) setStep(3);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/user/onboarding`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Submission failed");
      
      console.log("User Onboarding Completed:", formData);
      onComplete();
    } catch (err) {
      console.error("Onboarding submission error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-0.5 mb-1 block">First Name</label>
        <div className="relative">
          <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/70" />
          <Input 
            name="firstName" 
            value={formData.firstName} 
            onChange={handleInputChange} 
            placeholder="John" 
            className={cn(
              "h-9 pl-8 bg-background/50 text-sm focus-visible:ring-1 transition-all",
              errors.firstName && "border-destructive focus-visible:ring-destructive"
            )} 
          />
        </div>
        {errors.firstName && <p className="text-[9px] text-destructive font-medium ml-1 animate-in fade-in slide-in-from-left-1">{errors.firstName}</p>}
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-0.5 mb-1 block">Last Name</label>
        <div className="relative">
          <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/70" />
          <Input 
            name="lastName" 
            value={formData.lastName} 
            onChange={handleInputChange} 
            placeholder="Doe" 
            className={cn(
              "h-9 pl-8 bg-background/50 text-sm focus-visible:ring-1 transition-all",
              errors.lastName && "border-destructive focus-visible:ring-destructive"
            )} 
          />
        </div>
        {errors.lastName && <p className="text-[9px] text-destructive font-medium ml-1 animate-in fade-in slide-in-from-left-1">{errors.lastName}</p>}
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-0.5 mb-1 block">Business Name</label>
        <div className="relative">
          <Briefcase className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/70" />
          <Input 
            name="businessName" 
            value={formData.businessName} 
            onChange={handleInputChange} 
            placeholder="Realty Pros" 
            className={cn(
              "h-9 pl-8 bg-background/50 text-sm focus-visible:ring-1 transition-all",
              errors.businessName && "border-destructive focus-visible:ring-destructive"
            )} 
          />
        </div>
        {errors.businessName && <p className="text-[9px] text-destructive font-medium ml-1 animate-in fade-in slide-in-from-left-1">{errors.businessName}</p>}
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-0.5 mb-1 block">License #</label>
        <div className="relative">
          <ShieldCheck className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/70" />
          <Input 
            name="licenseNumber" 
            value={formData.licenseNumber} 
            onChange={handleInputChange} 
            placeholder="RE-123456" 
            className={cn(
              "h-9 pl-8 bg-background/50 text-sm focus-visible:ring-1 transition-all",
              errors.licenseNumber && "border-destructive focus-visible:ring-destructive"
            )} 
          />
        </div>
        {errors.licenseNumber && <p className="text-[9px] text-destructive font-medium ml-1 animate-in fade-in slide-in-from-left-1">{errors.licenseNumber}</p>}
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-0.5 mb-1 block">Phone</label>
        <div className="relative">
          <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/70" />
          <Input 
            name="phoneNumber" 
            value={formData.phoneNumber} 
            onChange={handleInputChange} 
            placeholder="+1 555..." 
            className={cn(
              "h-9 pl-8 bg-background/50 text-sm focus-visible:ring-1 transition-all",
              errors.phoneNumber && "border-destructive focus-visible:ring-destructive"
            )} 
          />
        </div>
        {errors.phoneNumber && <p className="text-[9px] text-destructive font-medium ml-1 animate-in fade-in slide-in-from-left-1">{errors.phoneNumber}</p>}
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-0.5 mb-1 block">Email</label>
        <div className="relative">
          <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/70" />
          <Input 
            name="professionalEmail" 
            value={formData.professionalEmail} 
            onChange={handleInputChange} 
            placeholder="john@..." 
            className={cn(
              "h-9 pl-8 bg-background/50 text-sm focus-visible:ring-1 transition-all",
              errors.professionalEmail && "border-destructive focus-visible:ring-destructive"
            )} 
          />
        </div>
        {errors.professionalEmail && <p className="text-[9px] text-destructive font-medium ml-1 animate-in fade-in slide-in-from-left-1">{errors.professionalEmail}</p>}
      </div>
      <div className="space-y-1 col-span-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-0.5 mb-1 block">Address</label>
        <div className="relative">
          <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/70" />
          <Input 
            name="address" 
            value={formData.address} 
            onChange={handleInputChange} 
            placeholder="123 St, City, Prov" 
            className={cn(
              "h-9 pl-8 bg-background/50 text-sm focus-visible:ring-1 transition-all",
              errors.address && "border-destructive focus-visible:ring-destructive"
            )} 
          />
        </div>
        {errors.address && <p className="text-[9px] text-destructive font-medium ml-1 animate-in fade-in slide-in-from-left-1">{errors.address}</p>}
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-0.5 mb-1 block">Years</label>
        <div className="relative">
          <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/70" />
          <Input 
            name="yearsInBusiness" 
            type="number" 
            value={formData.yearsInBusiness} 
            onChange={handleInputChange} 
            className={cn(
              "h-9 pl-8 bg-background/50 text-sm focus-visible:ring-1 transition-all",
              errors.yearsInBusiness && "border-destructive focus-visible:ring-destructive"
            )} 
          />
        </div>
        {errors.yearsInBusiness && <p className="text-[9px] text-destructive font-medium ml-1 animate-in fade-in slide-in-from-left-1">{errors.yearsInBusiness}</p>}
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-0.5 mb-1 block">Calendly</label>
        <div className="relative">
          <ArrowRight className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/70" />
          <Input 
            name="calendlyLink" 
            value={formData.calendlyLink} 
            onChange={handleInputChange} 
            placeholder="calendly..." 
            className={cn(
              "h-9 pl-8 bg-background/50 text-sm focus-visible:ring-1 transition-all",
              errors.calendlyLink && "border-destructive focus-visible:ring-destructive"
            )} 
          />
        </div>
        {errors.calendlyLink && <p className="text-[9px] text-destructive font-medium ml-1 animate-in fade-in slide-in-from-left-1">{errors.calendlyLink}</p>}
      </div>
    </div>
  );

  const renderStep2 = () => {
    const filteredCities = CANADA_CITIES.filter(city => 
      city.toLowerCase().includes(marketSearchText.toLowerCase())
    );

    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
        <div className="flex justify-between items-center mb-1">
          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/80 ml-1">Select Active Markets</p>
          {errors.markets && <p className="text-[10px] text-destructive font-bold animate-pulse">{errors.markets}</p>}
        </div>
        
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/50" />
          <Input 
            placeholder="Search cities..." 
            value={marketSearchText}
            onChange={(e) => setMarketSearchText(e.target.value)}
            className="h-9 pl-8 bg-background/40 text-[11px] border-border/40 focus-visible:ring-1"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto pr-1.5 custom-scrollbar pb-2">
          {filteredCities.length > 0 ? (
            filteredCities.map(city => (
              <button
                key={city}
                type="button"
                onClick={() => handleMarketToggle(city)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border",
                  formData.markets.includes(city)
                    ? "bg-foreground text-background border-foreground shadow-sm shadow-foreground/20"
                    : "bg-background/40 text-muted-foreground border-border/40 hover:border-foreground/40 hover:text-foreground"
                )}
              >
                {city}
              </button>
            ))
          ) : (
            <p className="text-[11px] text-muted-foreground italic w-full text-center py-4">No cities found matching your search</p>
          )}
        </div>

        {formData.markets.length > 0 && (
          <div className="pt-2 border-t border-border/20">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2">Selected Markets ({formData.markets.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {formData.markets.map(city => (
                <div 
                  key={city}
                  className="px-2 py-1 rounded-md bg-foreground/5 border border-foreground/10 text-[10px] font-bold flex items-center gap-1"
                >
                  {city}
                  <button 
                    type="button"
                    onClick={() => handleMarketToggle(city)}
                    className="p-0.5 hover:bg-foreground/10 rounded-full transition-colors"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-0.5 mb-1 block">Brokerage Name</label>
        <div className="relative">
          <Briefcase className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/70" />
          <Input 
            name="brokerageName" 
            value={formData.brokerageName} 
            onChange={handleInputChange} 
            placeholder="Century 21" 
            className={cn(
              "h-9 pl-8 bg-background/50 text-sm focus-visible:ring-1 transition-all",
              errors.brokerageName && "border-destructive focus-visible:ring-destructive"
            )} 
          />
        </div>
        {errors.brokerageName && <p className="text-[9px] text-destructive font-medium ml-1 animate-in fade-in slide-in-from-left-1">{errors.brokerageName}</p>}
      </div>

      <div className="grid grid-cols-3 gap-3 pt-1">
        {[
          { id: "signatureImageUrl", label: "Signature", icon: <CheckCircle2 className="h-4 w-4" /> },
          { id: "brandLogoUrl", label: "Brand Logo", icon: <Camera className="h-4 w-4" /> },
          { id: "brokerageLogoUrl", label: "Broker Logo", icon: <Briefcase className="h-4 w-4" /> },
        ].map(field => (
          <div key={field.id} className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-center block w-full mb-1">{field.label}</label>
            <div 
              onClick={() => triggerUpload(field.id)}
              className={cn(
                "relative group h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden",
                formData[field.id as keyof typeof formData] 
                  ? "border-foreground/30 bg-foreground/5" 
                  : "border-border/40 bg-background/40 hover:border-foreground/40 hover:bg-accent/30"
              )}
            >
              {uploadingField === field.id ? (
                <Loader2 className="h-5 w-5 animate-spin text-foreground" />
              ) : formData[field.id as keyof typeof formData] ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center p-1.5">
                  <img src={formData[field.id as keyof typeof formData] as string} alt={field.label} className="max-h-16 object-contain rounded-md" />
                </div>
              ) : (
                <div className="p-2 rounded-full bg-accent/40 group-hover:bg-primary/10 transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300 max-h-[320px] overflow-y-auto pr-1.5 custom-scrollbar">
      <div className="grid grid-cols-1 gap-3">
        <div className="bg-accent/20 p-3 rounded-lg border border-border/30 space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-foreground/80">
            <User className="h-3.5 w-3.5" /> Details
          </h3>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div><p className="text-muted-foreground scale-90 origin-left">Name</p><p className="font-semibold truncate">{formData.firstName} {formData.lastName}</p></div>
            <div><p className="text-muted-foreground scale-90 origin-left">License</p><p className="font-semibold truncate">{formData.licenseNumber}</p></div>
            <div className="col-span-2"><p className="text-muted-foreground scale-90 origin-left">Business</p><p className="font-semibold truncate">{formData.businessName}</p></div>
          </div>
        </div>

        <div className="bg-accent/20 p-3 rounded-lg border border-border/30 space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-foreground/80">
            <MapPin className="h-3.5 w-3.5" /> Markets
          </h3>
          <div className="flex flex-wrap gap-1">
            {formData.markets.length > 0 ? formData.markets.map(m => (
              <span key={m} className="px-1.5 py-0.5 rounded bg-background/50 border border-border/30 text-[10px] font-medium">{m}</span>
            )) : <p className="text-[10px] text-muted-foreground italic">None</p>}
          </div>
        </div>

        <div className="bg-accent/20 p-3 rounded-lg border border-border/30 space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-foreground/80">
            <Camera className="h-3.5 w-3.5" /> Branding
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {[formData.signatureImageUrl, formData.brandLogoUrl, formData.brokerageLogoUrl].map((img, i) => (
              <div key={i} className="h-12 bg-background/50 rounded-md border border-border/30 flex items-center justify-center p-1">
                {img ? <img src={img} className="max-h-10 object-contain rounded" /> : <X className="h-3 w-3 text-muted-foreground/30" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold tracking-tight text-foreground/90">
            STEP {step} OF 4
          </p>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <div 
                key={s} 
                className={cn(
                  "h-1.5 w-8 rounded-full transition-all duration-300",
                  s <= step ? "bg-foreground" : "bg-accent/40"
                )} 
              />
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-[220px]">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>

      <div className="flex justify-between items-center mt-8 pt-6 border-t border-border/30">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => step > 1 && setStep(step - 1)}
          className={cn("text-xs gap-1.5 h-10 px-4 font-medium opacity-60 hover:opacity-100 transition-opacity", step === 1 && "invisible")}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        
        <div className="flex gap-3">
          {step < 4 ? (
            <Button 
              size="sm"
              onClick={handleNext}
              className="text-xs h-10 px-6 font-bold bg-foreground text-background hover:bg-foreground/90 border-none shadow-lg transition-all active:scale-[0.98] rounded-xl"
            >
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button 
              size="sm"
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="text-xs h-10 px-8 font-bold bg-foreground text-background hover:bg-foreground/90 border-none shadow-lg transition-all active:scale-[0.98] rounded-xl"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Complete Setup <CheckCircle2 className="ml-2 h-4 w-4" /></>}
            </Button>
          )}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(var(--foreground), 0.1); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(var(--foreground), 0.2); }
      `}} />
    </div>
  );
}
