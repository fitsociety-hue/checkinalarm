// ==========================================
// 식사 체크인 시스템 Backend (Code.gs)
// ==========================================

// 만약 Web App에서 스프레드시트를 자동으로 찾지 못해 에러가 발생한다면,
// 아래 따옴표 안에 실제 스프레드시트 ID(URL의 /d/ 와 /edit 사이 문자열)를 입력하세요.
const SPREADSHEET_ID = ""; 

function getSheet(sheetName) {
  let ss;
  if (SPREADSHEET_ID) {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  } else {
    ss = SpreadsheetApp.getActive();
  }
  
  if (!ss) {
    throw new Error("스프레드시트를 찾을 수 없습니다. 코드 최상단의 SPREADSHEET_ID 값을 직접 입력해주세요.");
  }
  
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`'${sheetName}' 시트를 찾을 수 없습니다. 시트 이름이 정확한지 확인해주세요.`);
  }
  return sheet;
}

// CORS 이슈를 원천 차단하기 위해 GET 요청(JSONP)으로 통신합니다.
function doGet(e) {
  try {
    const action = e.parameter.action;
    const params = e.parameter.data ? JSON.parse(e.parameter.data) : {};
    const callback = e.parameter.callback;
    let result = {};

    if (action === 'login') {
      result = handleLogin(params);
    } else if (action === 'saveConfig') {
      result = handleSaveConfig(params);
    } else if (action === 'saveMeals') {
      result = handleSaveMeals(params);
    } else if (action === 'saveVolunteer') {
      result = handleSaveVolunteer(params);
    } else {
      result = { success: false, message: '알 수 없는 요청입니다.' };
    }

    if (callback) {
      return ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    const callback = e.parameter ? e.parameter.callback : null;
    const errorResult = JSON.stringify({ success: false, message: error.toString() });
    
    if (callback) {
      return ContentService.createTextOutput(callback + '(' + errorResult + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService.createTextOutput(errorResult)
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
}

// POST 요청(text/plain)을 통해 CORS 프리플라이트를 우회하고 데이터를 안전하게 전송합니다.
function doPost(e) {
  try {
    const params = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const action = params.action;
    const data = params.data || {};
    let result = {};

    if (action === 'login') {
      result = handleLogin(data);
    } else if (action === 'saveConfig') {
      result = handleSaveConfig(data);
    } else if (action === 'saveMeals') {
      result = handleSaveMeals(data);
    } else if (action === 'saveVolunteer') {
      result = handleSaveVolunteer(data);
    } else {
      result = { success: false, message: '알 수 없는 요청입니다.' };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// 핸들러 함수들
// ==========================================

// 1. 회원가입 및 로그인 처리
function handleLogin(params) {
  const { name, team, pin } = params;
  const sheet = getSheet('Users');
  const data = sheet.getDataRange().getValues();
  
  // 첫 행은 헤더이므로 제외하고 검색
  for (let i = 1; i < data.length; i++) {
    const [sName, sTeam, sPin, sRole] = data[i];
    if (sName === name && sTeam === team) {
      if (sPin.toString() === pin.toString()) {
        return { success: true, role: sRole };
      } else {
        return { success: false, message: '비밀번호가 일치하지 않습니다.' };
      }
    }
  }
  
  // 등록된 정보가 없으면 신규 회원가입 처리 (기본 employee 권한)
  const role = name.includes('관리자') ? 'admin' : 'employee';
  sheet.appendRow([name, team, pin, role]);
  return { success: true, role: role, message: '회원가입이 완료되었습니다.' };
}

// 2. 알람 시스템 설정 저장 (Config)
function handleSaveConfig(params) {
  const { systemName, sheetUrl, webhookUrl, startDate, endDate, weekdayOnly } = params;
  const sheet = getSheet('Config');
  
  // 기존 설정 덮어쓰기 (항상 2번째 행에 저장)
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, 1, 6).setValues([[systemName, sheetUrl, webhookUrl, startDate, endDate, weekdayOnly]]);
  } else {
    sheet.appendRow([systemName, sheetUrl, webhookUrl, startDate, endDate, weekdayOnly]);
  }
  return { success: true, message: '설정이 저장되었습니다.' };
}

// 3. 자원봉사자 식수 등록
function handleSaveVolunteer(params) {
  const { name, volunteerName, count } = params;
  const sheet = getSheet('Volunteers');
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const timestamp = new Date();
  
  sheet.appendRow([today, name, volunteerName, count, timestamp]);
  return { success: true };
}

// 4. 직원 식사 일정 저장 (업데이트)
function handleSaveMeals(params) {
  const { name, team, dates } = params;
  const sheet = getSheet('Meals');
  const data = sheet.getDataRange().getValues();
  
  dates.forEach(item => {
    let rowUpdated = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === item.dateStr && data[i][1] === name && data[i][2] === team) {
        sheet.getRange(i + 1, 4).setValue(item.status);
        sheet.getRange(i + 1, 5).setValue(new Date());
        rowUpdated = true;
        break;
      }
    }
    if (!rowUpdated) {
      sheet.appendRow([item.dateStr, name, team, item.status, new Date()]);
    }
  });

  return { success: true };
}

// ==========================================
// 10시 40분 자동 알람 로직 (트리거용)
// ==========================================
function setupTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  
  ScriptApp.newTrigger('checkAndSendAlert')
    .timeBased()
    .everyDays(1)
    .atHour(10)
    .create(); // 10시 대에 실행
}

function checkAndSendAlert() {
  const todayDate = new Date();
  const day = todayDate.getDay();
  
  // 주말(토=6, 일=0) 제외 로직 (Config의 weekdayOnly 반영)
  const configSheet = getSheet('Config');
  const configData = configSheet.getDataRange().getValues();
  if (configData.length < 2) return; // 설정 없음
  
  const [sysName, , webhookUrl, , , weekdayOnly] = configData[1];
  
  if (weekdayOnly === true && (day === 0 || day === 6)) {
    return; // 평일만 알람인데 주말인 경우 패스
  }
  
  const todayStr = Utilities.formatDate(todayDate, Session.getScriptTimeZone(), 'MMM d, EEE');
  
  // 1. 전체 직원 목록 가져오기
  const usersSheet = getSheet('Users');
  const usersData = usersSheet.getDataRange().getValues();
  const totalEmployees = usersData.length - 1; // 헤더 제외
  if (totalEmployees <= 0) return;
  
  // 2. 오늘의 식사 체크인 기록 가져오기
  const mealsSheet = getSheet('Meals');
  const mealsData = mealsSheet.getDataRange().getValues();
  
  let checkedCount = 0;
  for (let i = 1; i < mealsData.length; i++) {
    if (mealsData[i][0] === todayStr) {
      checkedCount++;
    }
  }
  
  // 3. 미완료 인원이 있는지 확인 후 구글 챗 웹훅 발송
  if (checkedCount < totalEmployees) {
    const uncheckCount = totalEmployees - checkedCount;
    const message = {
      text: `🔔 *[${sysName}] 식수 인원 조사 독려*\n\n아직 오늘의 식사 여부를 체크하지 않은 직원분이 ${uncheckCount}명 있습니다!\n오전 11시 전까지 체크인을 완료해 주시기 바랍니다.\n\n👉 *시스템 바로가기*: https://fitsociety-hue.github.io/checkinalarm/`
    };
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(message)
    };
    
    UrlFetchApp.fetch(webhookUrl, options);
  }
}

// 11시 이후 누락자 일괄 미식사 처리 로직 (트리거용)
function processUncheckedAsNoMeal() {
  const todayDate = new Date();
  const todayStr = Utilities.formatDate(todayDate, Session.getScriptTimeZone(), 'MMM d, EEE');
  
  const usersSheet = getSheet('Users');
  const usersData = usersSheet.getDataRange().getValues();
  const mealsSheet = getSheet('Meals');
  const mealsData = mealsSheet.getDataRange().getValues();
  
  // 이미 체크된 직원 찾기
  const checkedNames = [];
  for (let i = 1; i < mealsData.length; i++) {
    if (mealsData[i][0] === todayStr) {
      checkedNames.push(mealsData[i][1] + "_" + mealsData[i][2]); // 이름_팀명
    }
  }
  
  // 미체크 직원 'no-meal'로 추가
  for (let i = 1; i < usersData.length; i++) {
    const name = usersData[i][0];
    const team = usersData[i][1];
    
    if (!checkedNames.includes(name + "_" + team)) {
      mealsSheet.appendRow([todayStr, name, team, 'no-meal', new Date()]);
    }
  }
}
