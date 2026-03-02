import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const useLicense = (user: User | null) => {
    const [hasValidLicense, setHasValidLicense] = useState<boolean | null>(null);
    const [loadingLicense, setLoadingLicense] = useState(true);

    const checkLicense = async () => {
        if (!user) {
            setHasValidLicense(null);
            setLoadingLicense(false);
            return;
        }

        try {
            // 1. Get user's empresa_id from perfiles
            const { data: perfilData, error: perfilError } = await supabase
                .from('perfiles')
                .select('empresa_id')
                .eq('id', user.id)
                .single();

            if (perfilError || !perfilData) throw perfilError;

            // 2. Get empresa's expiration date
            const { data: empresaData, error: empresaError } = await supabase
                .from('empresas')
                .select('licencia_expira_el')
                .eq('id', perfilData.empresa_id)
                .single();

            if (empresaError || !empresaData) throw empresaError;

            // 3. Validate date
            const expirationDate = empresaData.licencia_expira_el;
            if (!expirationDate) {
                setHasValidLicense(false);
            } else {
                const expDate = new Date(expirationDate);
                const now = new Date();
                setHasValidLicense(expDate > now);
            }
        } catch (error) {
            console.error("Error checking license:", error);
            // Fallback securely blocking access if DB query fails
            setHasValidLicense(false);
        } finally {
            setLoadingLicense(false);
        }
    };

    useEffect(() => {
        checkLicense();
    }, [user]);

    return { hasValidLicense, loadingLicense, checkLicense };
};
