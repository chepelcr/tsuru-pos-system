import { useQuery } from '@tanstack/react-query';
import { salesApi, xmlPath } from '@/lib/api';
const xmlApi = salesApi;
import type { XmlFilesDto } from '@/types/document';

export function useXmlFiles(orgId: string, saleId: string | null) {
  return useQuery<XmlFilesDto>({
    queryKey: ['xml-files', orgId, saleId],
    queryFn: () => xmlApi.get<XmlFilesDto>(xmlPath(orgId, saleId!, '/files')),
    enabled: !!orgId && !!saleId,
  });
}
