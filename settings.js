(function () {
  const collectSettings = () => {
    const errors = []
    const instructions = $('#instructions').val()
    const previewType = $('#previewType').val()

    !instructions && errors.push('Instructions field must be completed');

    return {data: {instructions, previewType}, errors};
  }

  const exportSettings = () => {
    const data = collectSettings();
    window.codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.EXPORT_SETTINGS_RESPONSE, data);
  }

  const applySettings = (settings = {}) => {
    $('#instructions').val(settings.instructions || '');
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
  }

  window.addEventListener('load', onLoad);
})()
