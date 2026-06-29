(function () {
  let instructionsEditor = null

  const collectSettings = () => {
    const errors = []
    const instructions = instructionsEditor.getContent()
    const previewType = $('#previewType').val()

    !instructions && errors.push('Instructions field must be completed');

    return {data: {instructions, previewType}, errors};
  }

  const exportSettings = () => {
    const data = collectSettings();
    window.codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.EXPORT_SETTINGS_RESPONSE, data);
  }

  const applySettings = (settings = {}) => {
    instructionsEditor.setContent(settings.instructions || '')
    $('#previewType').val(settings.previewType || 'NONE')
  }

  const processMessage = (jsonData) => {
    console.log('settings iframe processMessage', jsonData)
    try {
      const {method, data} = JSON.parse(jsonData);
      switch (method) {
        case window.codioAssessmentsHelper.METHODS.EXPORT_SETTINGS:
          exportSettings();
          break;
        case window.codioAssessmentsHelper.METHODS.GET_SETTINGS_RESPONSE:
          applySettings(data.settings);
          break;
      }
    } catch {}
  }

  const onLoad = async () => {
    window.codioAssessmentsHelper.registerMessageListener(processMessage)
    window.codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.GET_SETTINGS)
    instructionsEditor = window.codioAssessmentsHelper.initializeMarkdownEditor('instructions', 'instructions-command-bar')
  }

  window.addEventListener('load', onLoad);
})()
