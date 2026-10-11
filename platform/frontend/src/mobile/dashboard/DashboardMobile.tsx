import { useAuth } from '../../auth/AuthContext'
import { BackgroundFooter } from '../../components/BackgroundRenderer'
import { useCosmetics } from '../../contexts/CosmeticsContext'
import MobilePage from '../MobilePage'
import AnalysisSection from './AnalysisSection'
import GreetingHeader from './GreetingHeader'
import HistorySection from './HistorySection'
import NextActionSection from './NextActionSection'
import StatusSection from './StatusSection'
import { useDashboardData } from './useDashboardData'

export default function DashboardMobile() {
  const { user } = useAuth()
  const { bg } = useCosmetics()
  const data = useDashboardData()

  return (
    <MobilePage background={<BackgroundFooter height={700} config={bg('bg_dashboard')} />}>
      <GreetingHeader name={user?.name ?? ''} />
      <StatusSection stats={data.stats} />
      <NextActionSection resume={data.resume} exercises={data.exercises} />
      <div style={{ marginTop: 'var(--sp-4)' }}>
        <AnalysisSection insights={data.insights} />
      </div>
      <HistorySection recent={data.recent} />
    </MobilePage>
  )
}
