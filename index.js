(function (){
  let assessmentOptions = null
  let assessment = null
  let processing = false
  let currentData = null

  const PreviewType = {
    NONE: 'NONE',
    MARKDOWN: 'MARKDOWN',
    RAW: 'RAW'
  }

  const updateProcessing = (status) => {
    processing = status
    refreshResultsAndFooter()
  }

  const applyStateInitial = (data) => {
    const {state, result, ...dataWithoutState} = data
    assessment = dataWithoutState.assessment
    assessmentOptions = dataWithoutState.options

    render()
  }

  const applyState = (data) => {
    console.log('assessment iframe applyState', data)
    currentData = data
    if (!assessment) {
      applyStateInitial(data)
      return
    }
    updateCheckButtonText()
    refreshResultsAndFooter()
    renderGuidance(getValue())
  }

  const onCheck = (event) => {
    event.preventDefault()
    updateProcessing(true)

    window.codioAssessmentsHelper.send(
      window.codioAssessmentsHelper.METHODS.SUBMIT_ANSWER,
      {result: {text: getValue()}}
    )
  }

  const onUnblock = (event) => {
    event.preventDefault()
    codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.UNBLOCK)
  }

  const onReset = (event) => {
    event.preventDefault()
    codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.RESET)
  }

  const onModify = (event) => {
    event.preventDefault()
    const {result} = currentData || {}
    codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.MODIFY, {status: result.status})
  }

  const onGrade = (event) => {
    event.preventDefault()
  }

  const saveState = () => {
    window.codioAssessmentsHelper.send(
      window.codioAssessmentsHelper.METHODS.SET_STATE,
      {state: {text: getValue()}})
  }

  const debounceSaveState = window.lodashDebounce(saveState, 500, {maxWait: 5000})

  const renderContent = () => {
    $('.instructions-text').html(assessment.source.settings.instructions)
  }

  const updateVisibility = (el, visible) => {
    visible ? el.removeClass('hide') : el.addClass('hide')
  }

  const updateFooterButtons = (value) => {
    const assessmentState = getAssessmentState(value)
    const {teacherInStudentsProject, showModify, isDisabled, canAnswerAgain, answered} = assessmentState

    const checkVisibility = !showModify && assessmentOptions.useSubmitButtons && !(answered && canAnswerAgain)
    const checkBtn = $('.check-button')
    updateVisibility(checkBtn, checkVisibility)
    checkBtn.prop('disabled', isDisabled)

    const unblockVisibility = !teacherInStudentsProject && showModify
    updateVisibility($('.unblock-button'), unblockVisibility)

    const resetVisibility = !showModify && answered && assessmentOptions.owner && !canAnswerAgain
    updateVisibility($('.reset-button'), resetVisibility)

    const modifyVisibility = !showModify && answered && canAnswerAgain && !teacherInStudentsProject
    const modifyBtn = $('.modify-button')
    updateVisibility(modifyBtn, modifyVisibility)
    modifyBtn.prop('disabled', isDisabled)

    const gradeVisibility = teacherInStudentsProject && assessment.source.points > 0
    updateVisibility($('.grade-button'), gradeVisibility)
  }

  const updateCheckButtonText = () => {
    const footerContainer = $('.codio-assessment-footer')
    const {result} = currentData || {}
    const caption = window.codioAssessmentsHelper.getButtonCaption(
      assessmentOptions,
      assessment.source.maxAttemptsCount,
      result?.usedAttempts || 0
    )
    footerContainer.find('.check-button').html(caption)
  }

  const renderGuidance = (value) => {
    const guidanceBlock = $('.codio-assessment-guidance-block')
    guidanceBlock.addClass('hide')
    guidanceBlock.empty()
    const assessmentState = getAssessmentState(value)
    const {result} = currentData || {}
    const guidance = window.codioAssessmentsHelper.calculateGuidance(
      !assessmentOptions.eduStartedAssignment,
      assessmentOptions.showAsTeacher,
      assessmentState.answered,
      assessment.source,
      result ?
        {
          answerGuidance: result.guidance,
          answerPoints: result.points,
          attemptsCount: result.usedAttempts,
          passed: result.state === window.codioAssessmentsHelper.States.PASS,
          isCompletedAndReleased: window.codioAssessmentsHelper.calculateCompletedAndReleased(
            assessmentOptions.eduStartedAssignment
          )
        } : {}
    )
    if (guidance) {
      const guidanceContainer = $('<div class="codio-assessment-guidance-container" />')
      const guidanceText = $('<div class="codio-assessment-guidance-text">').html(guidance)
      guidanceContainer.append(guidanceText)
      guidanceBlock.append(guidanceContainer)
      guidanceBlock.removeClass('hide')
    }
  }

  const renderPreview = async (value) => {
    const previewBlock = $('.codio-assessment-preview-block')
    previewBlock.addClass('hide')
    const type = assessment.source.settings.previewType || PreviewType.NONE
    if (type === PreviewType.NONE) {
      previewBlock.empty()
      return null
    }
    MathJax.startup.document.clearMathItemsWithin([previewBlock[0]]);
    previewBlock.empty()
    MathJax.texReset();
    MathJax.tex2mml('\\begingroupSandbox');
    if (type === PreviewType.RAW) {
      let processed = value.replace(/[\u00A0-\u9999<>\&]/gim, i => {
        return '&#' + i.charCodeAt(0) + ';'
      })
      processed = processed.replace(/\n/g, '<br/>')
      previewBlock.html(processed)
      previewBlock.removeClass('hide')
      MathJax.typeset([previewBlock])
      return
    }
    try {
      const file = await window.unified()
        .use(window.remarkParse)
        .use(window.remarkHtml)
        .process(value)
      previewBlock.html(file.value)
      MathJax.typeset([previewBlock])
      previewBlock.removeClass('hide')
    } catch (e) {
      console.error(e)
    }
  }

  const getInitialValue = () => {
    const {result, state} = currentData || {}
    const {useSubmitButtons, isDisabled} = assessmentOptions
    const answered = !!result?.answer

    const draft = state?.text || ''

    if (answered) {
      const canAnswerAgain = window.codioAssessmentsHelper.isCanAnswerAgain(assessment, result)
      if (!isDisabled && !useSubmitButtons && canAnswerAgain && draft) {
        return draft
      }
      return result.answer || ''
    }

    return draft
  }

  const getValue = () => {
    return $('#answer').val() || ''
  }

  const getAssessmentState = (value) => {
    const result = currentData ? currentData.result : null
    const answered = !!result?.answer
    const usedAttempts = result?.usedAttempts || 0
    const canAnswerAgain = !assessment.source.maxAttemptsCount || usedAttempts < assessment.source.maxAttemptsCount &&
      result?.status !== 'DONE'
    const isDisabled = processing || assessmentOptions.isDisabled || !value ||
      answered && !canAnswerAgain

    const teacherInStudentsProject = assessmentOptions.showAsTeacher && !assessmentOptions.owner
    const showModify = assessmentOptions.showUnblock && (!answered || canAnswerAgain)
    return {
      isDisabled,
      answered,
      usedAttempts,
      canAnswerAgain,
      showModify,
      teacherInStudentsProject
    }
  }

  const renderInfoBlock = (value) => {
    const assessmentState = getAssessmentState(value)
    const {result} = currentData || {}
    const infoBlock = $('.codio-assessment-info-block')
    infoBlock.addClass('hide')
    infoBlock.empty()
    if (!assessmentState.answered || assessment.source.points === 0) {
      return
    }
    let text
    if (result.status === 'DONE' && Number.isFinite(result.points)) {
      text = `<strong>Score :</strong> ${result.points} out of ${assessment.source.points}`
    } else {
      text = 'Your answer has been submitted and will be reviewed by your teacher in due course.'
    }
    infoBlock.html(text)
    infoBlock.removeClass('hide')
  }

  const renderTeacherComment = () => {
    // todo render comment
  }

  const refreshResultsAndFooter = (initialValue) => {
    if (!assessment) {
      return
    }
    const value = initialValue || getValue()
    const answerTa = $('#answer')
    answerTa.val(value)
    const assessmentState = getAssessmentState(value)
    answerTa.prop('readonly', assessmentState.answered || assessmentOptions.showUnblock)
    answerTa.prop('disabled', assessmentOptions.isDisabled)

    renderInfoBlock(value)
    renderTeacherComment()
    updateFooterButtons(value)
  }

  const bindEvents = () => {
    $('.check-button').on('click', onCheck)
    $('.unblock-button').on('click', onUnblock)
    $('.reset-button').on('click', onReset)
    $('.modify-button').on('click', onModify)
    $('.grade-button').on('click', onGrade)
    $('#answer').on('input propertychange', function () {
      debounceSaveState()
      updateFooterButtons(this.value)
      renderPreview(this.value)
    })

    window.codioAssessmentsHelper.addBodyHeightListener()
  }

  const render = () => {
    const container = $('.codio-assessment')
    const nameEl = container.find('.codio-assessment-name')
    assessment.source.showName ? nameEl.text(assessment.source.name) : nameEl.remove()
    renderContent()
    updateCheckButtonText()
    renderGuidance(getInitialValue())
    refreshResultsAndFooter(getInitialValue())
    renderPreview(getInitialValue())
    bindEvents()
    container.removeClass('hide')
  }

  const processMessage = (jsonData) => {
    try {
      const {method, data} = JSON.parse(jsonData)
      console.log('assessment iframe processMessage', jsonData, method, data)
      switch (method) {
        case window.codioAssessmentsHelper.METHODS.GET_STYLES_RESPONSE:
          window.codioAssessmentsHelper.addStyle(data.css)
          break
        case window.codioAssessmentsHelper.METHODS.GET_STATE_RESPONSE:
          updateProcessing(false)
          applyState(data)
          break
        case window.codioAssessmentsHelper.METHODS.CALLBACK: {
          window.codioAssessmentsHelper.processCallback(data)
          break
        }
      }
    } catch {}
  }

  window.addEventListener('load', () => {
    window.codioAssessmentsHelper.registerMessageListener(processMessage)
    window.codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.GET_STATE)
    window.codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.GET_STYLES)
  })
})()
