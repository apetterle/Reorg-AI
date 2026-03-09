import { Link } from "wouter";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbsProps {
  tenantSlug: string;
  companyName?: string;
  companyId?: string;
  projectName?: string;
  projectId?: string;
  currentSection?: string;
}

export function ProjectBreadcrumbs({ tenantSlug, companyName, companyId, projectName, projectId, currentSection }: BreadcrumbsProps) {
  const projectHref = companyId
    ? `/t/${tenantSlug}/c/${companyId}/projects/${projectId}`
    : `/t/${tenantSlug}/projects/${projectId}`;

  return (
    <Breadcrumb data-testid="breadcrumbs">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={`/t/${tenantSlug}`} data-testid="breadcrumb-tenant">
              {tenantSlug}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {companyName && companyId && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {projectName ? (
                <BreadcrumbLink asChild>
                  <Link href={`/t/${tenantSlug}/c/${companyId}`} data-testid="breadcrumb-company">
                    {companyName}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage data-testid="breadcrumb-company">{companyName}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </>
        )}
        {projectName && projectId && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {currentSection ? (
                <BreadcrumbLink asChild>
                  <Link href={projectHref} data-testid="breadcrumb-project">
                    {projectName}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage data-testid="breadcrumb-project">{projectName}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </>
        )}
        {currentSection && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage data-testid="breadcrumb-section">{currentSection}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
