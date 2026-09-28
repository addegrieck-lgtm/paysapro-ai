import type { CatalogItem, Project } from '../../types';
import type { ProjectContext } from '../../services/ai';
import { totalArea, totalLength } from '../measurements/geometry';

/** Construit le contexte envoyé à l'assistant à partir des données du chantier. */
export function buildProjectContext(project: Project, photoCount: number, catalog: CatalogItem[]): ProjectContext {
  const area = totalArea(project.zones);
  const length = totalLength(project.linears);
  return {
    categories: project.categories,
    description: project.description,
    area: area.counted > 0 && area.total > 0 ? area.total : null,
    areaApproximate: area.approximate,
    length: length.counted > 0 ? length.total : null,
    photoCount,
    catalog,
  };
}
