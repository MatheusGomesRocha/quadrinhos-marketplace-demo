import { RepoMemoria } from '../memoria';
import { suiteRegras } from './suite-regras';

suiteRegras('memória', async () => new RepoMemoria());
