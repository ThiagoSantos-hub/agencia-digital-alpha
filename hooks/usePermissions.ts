import { useAuth } from './useAuth'

export function usePermissions() {
  const { profile } = useAuth()

  const isAdmin = profile?.role === 'admin'
  const isManager = profile?.role === 'manager'

  return {
    isAdmin,
    isManager,
    can: {
      // Clientes
      viewAllClients: isAdmin,
      viewOwnClients: isAdmin || isManager,
      createClient: isAdmin || isManager,
      editClient: isAdmin || isManager,
      deleteClient: isAdmin,

      // Campanhas
      viewAllCampaigns: isAdmin,
      viewOwnCampaigns: isAdmin || isManager,
      createCampaign: isAdmin || isManager,
      editCampaign: isAdmin || isManager,
      deleteCampaign: isAdmin,

      // Usuários e configurações
      manageUsers: isAdmin,
      viewSettings: isAdmin,
      manageIntegrations: isAdmin,
    },
  }
}
