from fastapi import APIRouter
from tubemerger.apps.binaries.services import BinaryService
from tubemerger.apps.binaries.controllers import BinaryController
from tubemerger.apps.binaries.schemas import HealthResponseSchema, InstallBinariesResponseSchema

router = APIRouter(prefix="/api", tags=["binaries"])

controller = BinaryController(binary_service=BinaryService())

@router.get("/health", response_model=HealthResponseSchema)
def get_health():
    return controller.get_health()

@router.post("/install-binaries", response_model=InstallBinariesResponseSchema)
def install_binaries():
    return controller.install_binaries()
