export const ptAO = {
  brand: {
    name: 'KambaGo',
    slogan: 'Vamos juntos.',
    tagline: 'Mais pessoas. Menos custos. Uma só rota.',
    corridorBadge: 'Corredor inicial: Zango → Mutamba',
  },
  common: {
    loading: 'A carregar...',
    save: 'Guardar alterações',
    saving: 'A guardar...',
    cancel: 'Cancelar',
    back: 'Voltar',
    next: 'Seguinte',
    skip: 'Saltar',
    confirm: 'Confirmar',
    retry: 'Tentar novamente',
    pendingSetupBadge: 'Configuração pendente',
    pendingConfirmation: 'Pendente de confirmação',
    legalDraftBadge: 'Rascunho a validar por advogado',
    currencySymbol: 'Kz',
    countryCode: '+244',
    offlineNotice: 'Ligação fraca ou sem internet. Algumas ações aguardam rede.',
  },
  setupStatus: {
    title: 'Estado da configuração do projeto',
    supabaseMissing:
      'Supabase ainda não configurado neste ambiente (faltam EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY). As operações de servidor ficam bloqueadas até configuração.',
    supabaseReady: 'Ligação ao Supabase ativa.',
    mapsMissing:
      'Chave de mapas em configuração pendente (camada de abstração pronta para Google Maps / Mapbox).',
    storageMissing:
      'Upload de fotografia no Storage requer projeto Supabase configurado com bucket privado.',
  },
  welcome: {
    headline: 'Partilha o táxi no teu corredor habitual em Luanda.',
    subheadline:
      'Combina o percurso com quem segue na mesma direção, com preço claro em Kz antes de entrar.',
    primaryCta: 'Começar',
    secondaryCta: 'Já tenho conta',
    legalLink: 'Termos e Privacidade',
  },
  onboarding: {
    stepLabel: 'Passo',
    slides: [
      {
        title: 'Uma só rota, menos custos',
        body: 'Passageiros que vão para o mesmo destino dividem o valor total da corrida em partes claras.',
      },
      {
        title: 'Preço máximo garantido',
        body: 'Vês sempre o limite máximo em Kz antes de confirmar. Se entrarem mais passageiros, o valor por lugar desce.',
      },
      {
        title: 'Pensado para a tua segurança',
        body: 'E-mail confirmado, contactos de confiança e estado da conta acompanhado para viajar com tranquilidade.',
      },
    ],
    finishCta: 'Criar conta',
    loginCta: 'Entrar na conta',
  },
  auth: {
    loginTitle: 'Entrar no KambaGo',
    loginSubtitle: 'Usa o teu e-mail registado e a tua palavra-passe.',
    registerTitle: 'Criar conta',
    registerSubtitle: 'Regista-te com o teu e-mail para receber o código ou link de confirmação.',
    forgotTitle: 'Recuperar palavra-passe',
    forgotSubtitle:
      'Indica o e-mail associado à tua conta para receber instruções de recuperação.',
    verifyEmailTitle: 'Confirmar e-mail',
    verifyEmailSubtitle:
      'Introduz o código de confirmação de 6 dígitos enviado para o teu e-mail.',
    fields: {
      fullName: 'Nome completo',
      fullNamePlaceholder: 'Ex.: Manuel Domingos',
      phone: 'Telefone (+244)',
      phonePlaceholder: '+244 923 000 000',
      email: 'E-mail',
      emailRecovery: 'E-mail registado',
      emailPlaceholder: 'nome@exemplo.ao',
      password: 'Palavra-passe',
      passwordPlaceholder: 'Mínimo 8 caracteres',
      confirmPassword: 'Confirmar palavra-passe',
      confirmPasswordPlaceholder: 'Repete a palavra-passe',
      emailCode: 'Código de confirmação (6 dígitos)',
      emailCodePlaceholder: '000000',
      role: 'Como vais usar o KambaGo?',
      rolePassenger: 'Passageiro',
      roleDriver: 'Motorista / Taxista',
    },
    consent: {
      termsLabel:
        'Li e aceito os Termos de Utilização e a Política de Privacidade (rascunho a validar por advogado).',
      locationNotice:
        'A localização só será pedida quando a aplicação estiver em uso e nunca de forma oculta.',
    },
    actions: {
      submitLogin: 'Entrar',
      submitRegister: 'Criar conta',
      submitForgot: 'Enviar recuperação',
      submitVerifyEmail: 'Confirmar código',
      resendEmailCode: 'Reenviar código por e-mail',
      sendEmailLink: 'Enviar link de acesso por e-mail',
      forgotLink: 'Esqueci-me da palavra-passe',
      goToRegister: 'Não tens conta? Criar conta',
      goToLogin: 'Já tens conta? Entrar',
      verifyEmailLink: 'Já tenho código de confirmação',
      logout: 'Terminar sessão',
    },
    feedback: {
      loginSuccess: 'Sessão iniciada com sucesso.',
      loginEmailNotConfirmed:
        'O teu e-mail ainda não foi confirmado. Introduz o código de 6 dígitos enviado para o teu e-mail.',
      registerPendingConfig:
        'Formulário validado, mas o registo no servidor aguarda configuração do Supabase neste ambiente.',
      registerSuccess:
        'Conta criada. Introduz o código enviado para o teu e-mail para confirmar o cadastro.',
      emailAlreadyRegistered:
        'Este endereço de e-mail já está registado. Inicia sessão ou confirma o código enviado anteriormente.',
      forgotSent: 'Se a conta existir no servidor, receberás as instruções de recuperação.',
      emailLinkSent:
        'Enviámos um link de autenticação para o teu e-mail. Abre a tua caixa de correio para continuar.',
      emailCodePendingConfig:
        'O envio e confirmação de código por e-mail aguardam configuração do Supabase neste ambiente.',
      emailCodeResent: 'Novo código de confirmação enviado para o teu e-mail.',
      emailVerifySuccess: 'E-mail confirmado com sucesso.',
      emailVerifySuccessPassengerActive:
        'E-mail confirmado com sucesso. A tua conta de passageiro está ativa.',
      emailVerifySuccessDriverPending:
        'E-mail confirmado com sucesso. A tua conta de motorista aguarda aprovação administrativa.',
      emailVerifyAccountSuspended:
        'E-mail confirmado, mas a tua conta permanece suspensa. Contacta o suporte.',
      emailConfirmFailed:
        'Código validado, mas não foi possível confirmar a ativação da conta no servidor.',
      unauthenticatedTitle: 'Sessão ainda não iniciada',
      unauthenticatedBody:
        'Quando iniciares sessão num projeto Supabase configurado, os teus dados reais aparecem aqui.',
    },
  },
  profile: {
    title: 'O meu perfil',
    subtitle: 'Dados pessoais mínimos, segurança e preferências de ligação.',
    editTitle: 'Editar perfil',
    accountStatusLabel: 'Estado da conta',
    statuses: {
      pendente: {
        label: 'Pendente',
        description: 'A aguardar confirmação do e-mail ou aprovação inicial.',
      },
      ativa: {
        label: 'Ativa',
        description: 'Conta verificada e pronta para utilizar o KambaGo.',
      },
      suspensa: {
        label: 'Suspensa',
        description: 'Acesso temporariamente bloqueado. Contacta o suporte.',
      },
    },
    roles: {
      passenger: 'Passageiro',
      driver: 'Taxista / Motorista',
      admin: 'Administrador',
    },
    photo: {
      title: 'Fotografia de perfil',
      uploadCta: 'Carregar fotografia',
      changeCta: 'Alterar fotografia',
      privateStorageNote:
        'Guardada em ficheiro privado no Supabase Storage com acesso por URL assinada de curta duração.',
      compressedNote: 'Modo poupança ativo: imagem comprimida antes do envio.',
      pendingConfig: 'Upload desativado: aguarda configuração do Supabase Storage.',
    },
    dataSaver: {
      title: 'Modo poupança de dados',
      description:
        'Reduz atualizações de mapa e comprime fotografias para gastar menos saldo em redes móveis lentas.',
      enabled: 'Ativado',
      disabled: 'Desativado',
    },
    smsNotifications: {
      title: 'Notificações Push (Expo Notifications)',
      description:
        'Sem chaves de projeto configuradas, as notificações permanecem desativadas nas definições.',
      pendingLabel: 'Desativadas (configuração pendente)',
      readyLabel: 'Projeto Expo configurado (registo de token disponível)',
    },
    inttSection: {
      title: 'Registo regulatório (INTT)',
      status: 'Pendente de confirmação',
      description:
        'Campos reservados para número de licença e registo exigido pelo INTT, aguardando validação jurídica local.',
      licenseField: 'Número de registo INTT',
      licensePlaceholder: 'Pendente de definição oficial',
    },
    legalLink: 'Termos, Privacidade e Consentimentos',
    deleteAccount: {
      title: 'Eliminar conta',
      subtitle: 'Remove os teus dados pessoais e revoga consentimentos.',
      warning:
        'Esta ação elimina o teu perfil e historial pessoal, mantendo apenas registos obrigatórios anonimizados para integridade financeira.',
      confirmLabel: 'Escreve ELIMINAR para confirmar',
      confirmKeyword: 'ELIMINAR',
      cta: 'Eliminar a minha conta',
      pendingConfig:
        'A exclusão definitiva requer ligação ativa ao servidor Supabase.',
    },
  },
  legal: {
    title: 'Termos e Política de Privacidade',
    draftNotice: 'Documento de rascunho a validar por advogado antes da publicação oficial.',
    sections: [
      {
        title: '1. Objeto do serviço KambaGo',
        body: 'O KambaGo liga passageiros e motoristas que seguem na mesma rota em Luanda, começando pelo corredor Zango → Mutamba. O pagamento na fase atual é efetuado em dinheiro diretamente ao motorista.',
      },
      {
        title: '2. Dados pessoais mínimos',
        body: 'Recolhemos apenas nome, e-mail, número de telefone (+244), fotografia opcional e registos de viagem estritamente necessários para segurança e cálculo de partilha.',
      },
      {
        title: '3. Localização e contactos de confiança',
        body: 'A localização é acedida apenas com consentimento explícito e enquanto a app está em uso. A partilha com contactos de confiança só ocorre quando o utilizador ativa essa opção ou o botão de emergência.',
      },
      {
        title: '4. Direito de exclusão',
        body: 'Podes solicitar a eliminação da tua conta diretamente na área de Perfil a qualquer momento.',
      },
    ],
  },
  validation: {
    required: 'Campo obrigatório.',
    fullNameMin: 'Indica o teu nome completo (mínimo 3 caracteres).',
    phoneInvalid: 'Usa um número angolano válido no formato +244 9XX XXX XXX.',
    emailInvalid: 'Indica um endereço de e-mail válido.',
    passwordMin: 'A palavra-passe deve ter pelo menos 8 caracteres.',
    passwordsMismatch: 'As palavras-passe não coincidem.',
    emailCodeInvalid: 'O código de confirmação deve ter exatamente 6 dígitos numéricos.',
    consentRequired: 'Tens de aceitar os Termos e a Política de Privacidade para continuar.',
    deleteKeywordMismatch: 'Escreve exatamente ELIMINAR para confirmar.',
  },
  navigation: {
    stageLabel: 'Etapa 1 · Autenticação e Perfis',
    screensTitle: 'Ecrãs da Etapa 1',
    screens: {
      welcome: 'Boas-vindas',
      onboarding: 'Introdução',
      login: 'Entrar',
      register: 'Criar conta',
      forgotPassword: 'Recuperar senha',
      verifyEmail: 'Confirmar e-mail',
      profile: 'Perfil',
      legal: 'Termos e Privacidade',
    },
  },
} as const;

export type Translations = typeof ptAO;
