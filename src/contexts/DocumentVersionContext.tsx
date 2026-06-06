import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { useAllDocumentVersions } from '@/hooks/useDataApi';
import { dataApiClient } from '@/services/data-api';

interface DocumentVersionContextType {
  documentVersionId: number | undefined;
  isLoading: boolean;
  isError: boolean;
}

const DocumentVersionContext = createContext<DocumentVersionContextType | undefined>(undefined);

interface DocumentVersionProviderProps {
  children: React.ReactNode;
  isoCode: string;
}

export function DocumentVersionProvider({ children, isoCode }: DocumentVersionProviderProps) {
  const { data: versions, isLoading, isError } = useAllDocumentVersions(
    { iso_code: isoCode, status: '1' },
    {
      enabled: !!isoCode,
      staleTime: 60 * 60 * 1000, // 1 hour — document versions rarely change
    }
  );

  const documentVersionId = useMemo(() => {
    if (!versions || versions.length === 0) return undefined;
    const sorted = [...versions].sort((a, b) =>
      new Date(b.version_date).getTime() - new Date(a.version_date).getTime()
    );
    return sorted[0]?.id;
  }, [versions]);

  // Inject into the singleton client so all data API calls get it automatically
  useEffect(() => {
    dataApiClient.setDocumentVersionId(documentVersionId);
  }, [documentVersionId]);

  return (
    <DocumentVersionContext.Provider value={{ documentVersionId, isLoading, isError }}>
      {children}
    </DocumentVersionContext.Provider>
  );
}

export function useDocumentVersion() {
  const context = useContext(DocumentVersionContext);
  if (context === undefined) {
    throw new Error('useDocumentVersion must be used within a DocumentVersionProvider');
  }
  return context;
}
